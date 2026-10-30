import { randomInt } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { Timestamp } from 'firebase-admin/firestore';
import { accountSchema, type Account } from '../../../shared/account.js';
import {
  canonicalPreferences,
  canonicalVisibility,
  currentUserSchema,
  defaultPreferences,
  toLegacyAccount,
  type Completion,
  type CurrentUser,
  type DraftPatch,
  type PreferencesPatch,
  type PrivacyPatch,
} from '../../../shared/users.js';
import { AccountError, type Identity } from './contracts.js';
import type { AccountDatabase, AccountTransaction } from './database.js';
import type {
  AuditLog,
  UserDocument,
  UserProfileDocument,
} from './documents.js';
import { getServerConfig } from '../../config/index.js';
const key = (uid: string) => encodeURIComponent(uid);
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;
function stored<T>(v: unknown, uid: string): T {
  if (!object(v) || v.userId !== uid)
    throw new AccountError(500, 'internal-error', 'errors.internal-error');
  return v as T;
}
export function usernameBase(name: string | undefined, uid: string) {
  if (!name || name.includes('@') || name === uid) return 'flow-member';
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)
    .replace(/-$/, '');
  return base.length >= 3 ? base : 'flow-member';
}
function safeAvatar(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
export function ensureActive(user: UserDocument) {
  if (user.accountStatus !== 'active')
    throw new AccountError(
      403,
      user.accountStatus === 'suspended'
        ? 'account-suspended'
        : user.accountStatus === 'deletion_pending'
          ? 'account-deletion-pending'
          : 'account-deleted',
      user.accountStatus === 'suspended'
        ? 'errors.account-suspended'
        : 'errors.account-disabled',
    );
}
function dto(u: UserDocument, p: UserProfileDocument): CurrentUser {
  return currentUserSchema.parse({
    account: {
      userId: u.userId,
      accountStatus: u.accountStatus,
      onboardingStatus: u.onboardingStatus,
      locale: u.locale,
    },
    profile: {
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      bio: p.bio,
      profileVisibility: p.profileVisibility,
      interests: p.interests,
    },
    preferences: u.preferences,
    privacySettings: u.privacySettings,
    onboarding: {
      currentStep: u.onboardingCurrentStep,
      draft: u.onboardingDraft,
    },
    revision: u.revision,
    createdAt: u.createdAt.toDate().toISOString(),
    updatedAt: u.updatedAt.toDate().toISOString(),
  });
}
function audit(
  tx: AccountTransaction,
  id: string,
  userId: string,
  type: AuditLog['eventType'],
  now: Timestamp,
  metadata: Record<string, unknown> = {},
) {
  const config = getServerConfig();
  tx.create(`auditLogs/${key(userId)}-${id}`, {
    eventType: type,
    actorUserId: userId,
    targetUserId: userId,
    environment: config.environment,
    appVersion: config.version,
    createdAt: now,
    metadata,
  } satisfies AuditLog);
}
async function limit(
  tx: AccountTransaction,
  uid: string,
  bucket: string,
  now: Timestamp,
  max: number,
) {
  const path = `rateLimits/${key(uid)}-${bucket}`;
  const raw = await tx.get(path);
  const reset =
    object(raw) && raw.resetAt instanceof Timestamp
      ? raw.resetAt.toMillis()
      : 0;
  const count = object(raw) && typeof raw.count === 'number' ? raw.count : 0;
  if (reset > now.toMillis() && count >= max)
    throw new AccountError(
      429,
      'rate-limit-exceeded',
      'errors.rate-limit-exceeded',
      true,
    );
  return {
    path,
    data: {
      count: reset > now.toMillis() ? count + 1 : 1,
      resetAt: Timestamp.fromMillis(
        reset > now.toMillis() ? reset : now.toMillis() + 60000,
      ),
    },
  };
}
export class UserAccountService {
  constructor(private db: AccountDatabase) {}
  async bootstrap(identity: Identity) {
    return this.db.run(async (tx) => {
      const now = this.db.now();
      const id = key(identity.uid);
      const userPath = `users/${id}`,
        profilePath = `profiles/${id}`;
      const [existing, profile, legacy, rate] = await Promise.all([
        tx.get(userPath),
        tx.get(profilePath),
        tx.get(`accounts/${id}`),
        limit(tx, identity.uid, 'bootstrap', now, 60),
      ]);
      if (existing) {
        const user = stored<UserDocument>(existing, identity.uid);
        stored<UserProfileDocument>(profile, identity.uid);
        tx.set(userPath, { ...user, lastLoginAt: now, lastActiveAt: now });
        tx.set(rate.path, rate.data);
        return {
          account: {
            userId: user.userId,
            accountStatus: user.accountStatus,
            onboardingStatus: user.onboardingStatus,
            locale: user.locale,
          },
        };
      }
      const old = accountSchema.safeParse(legacy);
      if (
        legacy !== undefined &&
        (!old.success || old.data.uid !== identity.uid)
      )
        throw new AccountError(
          500,
          'user-bootstrap-failed',
          'errors.user-bootstrap-failed',
          false,
        );
      const migrated =
        old.success && old.data.uid === identity.uid ? old.data : null;
      const name = (migrated?.displayName || identity.name || 'FlowCircle')
        .trim()
        .slice(0, 80);
      const base = usernameBase(name, identity.uid);
      let username = '';
      for (let i = 0; i < 12; i++) {
        const candidate =
          i === 0 ? base : `${base}-${randomInt(1000, 1000000)}`;
        const reserved = await tx.get(`usernames/${candidate}`);
        if (!reserved) {
          username = candidate;
          break;
        }
      }
      if (!username)
        throw new AccountError(
          503,
          'username-reservation-failed',
          'errors.username-reservation-failed',
          true,
        );
      const preferences = migrated
        ? canonicalPreferences(migrated.onboarding)
        : defaultPreferences();
      const visibility = migrated
        ? canonicalVisibility(migrated.onboarding.privacy)
        : 'private';
      const completed = migrated?.onboarding.completed ?? false;
      const user: UserDocument = {
        userId: identity.uid,
        authProvider: 'google',
        role: 'user',
        accountStatus: 'active',
        onboardingStatus: completed
          ? 'completed'
          : migrated
            ? 'in_progress'
            : 'not_started',
        onboardingCurrentStep: completed
          ? null
          : (migrated?.onboarding.step ?? 0) + 1,
        onboardingDraft: completed
          ? null
          : {
              currentStep: (migrated?.onboarding.step ?? 0) + 1,
              preferences,
              profileVisibility: visibility,
            },
        locale: migrated?.locale ?? 'de-DE',
        timezone: null,
        preferences,
        privacySettings: {
          profileVisibility: visibility,
          progressVisibility: 'private',
          notes: 'private',
        },
        annualSessionGoal: null,
        revision: migrated?.revision ?? 0,
        createdAt: migrated
          ? Timestamp.fromDate(new Date(migrated.createdAt))
          : now,
        updatedAt: now,
        lastLoginAt: now,
        lastActiveAt: now,
      };
      const nextProfile: UserProfileDocument = {
        userId: identity.uid,
        username,
        normalizedUsername: username,
        displayName: name,
        avatarUrl: safeAvatar(identity.photoUrl),
        bio: migrated?.bio ?? '',
        interests: completed ? preferences.activityTypes : [],
        profileVisibility: completed ? visibility : 'private',
        followerCount: 0,
        followingCount: 0,
        circleCount: 0,
        createdAt: user.createdAt,
        updatedAt: now,
      };
      tx.create(userPath, user);
      tx.create(profilePath, nextProfile);
      tx.create(`usernames/${username}`, {
        userId: identity.uid,
        createdAt: now,
      });
      tx.set(rate.path, rate.data);
      audit(tx, 'created', identity.uid, 'user_created', now, {
        migrated: !!migrated,
      });
      return {
        account: {
          userId: user.userId,
          accountStatus: user.accountStatus,
          onboardingStatus: user.onboardingStatus,
          locale: user.locale,
        },
      };
    });
  }
  async read(identity: Identity) {
    return this.db.run(async (tx) => {
      const id = key(identity.uid);
      const [u, p] = await Promise.all([
        tx.get(`users/${id}`),
        tx.get(`profiles/${id}`),
      ]);
      if (!u)
        throw new AccountError(
          409,
          'user-bootstrap-required',
          'errors.user-bootstrap-failed',
          true,
        );
      const user = stored<UserDocument>(u, identity.uid);
      ensureActive(user);
      const profile = stored<UserProfileDocument>(p, identity.uid);
      tx.set(`users/${id}`, { ...user, lastActiveAt: this.db.now() });
      return dto(user, profile);
    });
  }
  private async change(
    identity: Identity,
    bucket: string,
    expectedRevision: number | undefined,
    apply: (
      u: UserDocument,
      p: UserProfileDocument,
    ) => {
      user: UserDocument;
      profile: UserProfileDocument;
      complete?: boolean;
      unchanged?: boolean;
    },
  ) {
    return this.db.run(async (tx) => {
      const id = key(identity.uid);
      const now = this.db.now();
      const [raw, praw, rate] = await Promise.all([
        tx.get(`users/${id}`),
        tx.get(`profiles/${id}`),
        limit(
          tx,
          identity.uid,
          bucket,
          now,
          bucket === 'onboarding' ? 240 : 120,
        ),
      ]);
      if (!raw)
        throw new AccountError(
          409,
          'user-bootstrap-required',
          'errors.user-bootstrap-failed',
          true,
        );
      const user = stored<UserDocument>(raw, identity.uid);
      ensureActive(user);
      const profile = stored<UserProfileDocument>(praw, identity.uid);
      const result = apply(user, profile);
      if (result.unchanged) {
        tx.set(rate.path, rate.data);
        return dto(user, profile);
      }
      if (expectedRevision !== undefined && user.revision !== expectedRevision)
        throw new AccountError(
          409,
          'account-conflict',
          'account.conflict',
          true,
        );
      const next = {
        ...result.user,
        userId: user.userId,
        role: user.role,
        accountStatus: user.accountStatus,
        revision: user.revision + 1,
        createdAt: user.createdAt,
        updatedAt: now,
        lastActiveAt: now,
      };
      const nextProfile = {
        ...result.profile,
        userId: profile.userId,
        username: profile.username,
        normalizedUsername: profile.normalizedUsername,
        createdAt: profile.createdAt,
        updatedAt: now,
      };
      tx.set(`users/${id}`, next);
      tx.set(`profiles/${id}`, nextProfile);
      tx.set(rate.path, rate.data);
      if (result.complete && user.onboardingStatus !== 'completed')
        audit(
          tx,
          'onboarding-completed',
          identity.uid,
          'onboarding_completed',
          now,
        );
      if (profile.profileVisibility !== nextProfile.profileVisibility)
        audit(
          tx,
          `visibility-${next.revision}`,
          identity.uid,
          'profile_visibility_changed',
          now,
          {
            from: profile.profileVisibility,
            to: nextProfile.profileVisibility,
          },
        );
      return dto(next, nextProfile);
    });
  }
  saveDraft(identity: Identity, input: DraftPatch) {
    return this.change(
      identity,
      'onboarding',
      input.expectedRevision,
      (user, profile) => {
        if (user.onboardingStatus === 'completed')
          throw new AccountError(
            409,
            'onboarding-already-completed',
            'errors.onboarding-invalid-step',
          );
        const draft = user.onboardingDraft ?? {
          currentStep: 1,
          preferences: user.preferences,
          profileVisibility: user.privacySettings.profileVisibility,
        };
        return {
          user: {
            ...user,
            onboardingStatus: 'in_progress',
            onboardingCurrentStep: input.currentStep,
            onboardingDraft: {
              currentStep: input.currentStep,
              preferences: {
                ...draft.preferences,
                ...input.partialPreferences,
              },
              profileVisibility:
                input.profileVisibility ?? draft.profileVisibility,
            },
          },
          profile,
        };
      },
    );
  }
  complete(identity: Identity, input: Completion) {
    return this.change(
      identity,
      'complete',
      input.expectedRevision,
      (user, profile) => {
        if (
          user.onboardingStatus === 'completed' &&
          isDeepStrictEqual(user.preferences, input.preferences) &&
          profile.profileVisibility === input.profileVisibility
        )
          return { user, profile, unchanged: true };
        return {
          user: {
            ...user,
            preferences: input.preferences,
            privacySettings: {
              ...user.privacySettings,
              profileVisibility: input.profileVisibility,
            },
            onboardingStatus: 'completed',
            onboardingCurrentStep: null,
            onboardingDraft: null,
          },
          profile: {
            ...profile,
            interests: input.preferences.activityTypes,
            profileVisibility: input.profileVisibility,
          },
          complete: true,
        };
      },
    );
  }
  preferences(identity: Identity, input: PreferencesPatch) {
    return this.change(
      identity,
      'preferences',
      input.expectedRevision,
      (user, profile) => {
        const { expectedRevision, locale, ...values } = input;
        void expectedRevision;
        const preferences = { ...user.preferences, ...values };
        return {
          user: { ...user, preferences, locale: locale ?? user.locale },
          profile: { ...profile, interests: preferences.activityTypes },
        };
      },
    );
  }
  privacy(identity: Identity, input: PrivacyPatch) {
    return this.change(
      identity,
      'privacy',
      input.expectedRevision,
      (user, profile) => ({
        user: {
          ...user,
          privacySettings: {
            ...user.privacySettings,
            profileVisibility: input.profileVisibility,
          },
        },
        profile: { ...profile, profileVisibility: input.profileVisibility },
      }),
    );
  }
  async legacyRead(identity: Identity): Promise<Account> {
    await this.bootstrap(identity);
    return toLegacyAccount(await this.read(identity));
  }
  async legacyUpdate(
    identity: Identity,
    expectedRevision: number,
    change: (a: Account) => Account,
  ): Promise<Account> {
    const current = toLegacyAccount(await this.read(identity));
    const next = accountSchema.parse(change(structuredClone(current)));
    if (
      next.onboarding.completed &&
      !isDeepStrictEqual(next.onboarding, current.onboarding)
    ) {
      return toLegacyAccount(
        await this.complete(identity, {
          expectedRevision,
          preferences: canonicalPreferences(next.onboarding),
          profileVisibility: canonicalVisibility(next.onboarding.privacy),
        }),
      );
    }
    if (
      JSON.stringify(next.onboarding) !== JSON.stringify(current.onboarding)
    ) {
      return toLegacyAccount(
        await this.saveDraft(identity, {
          expectedRevision,
          currentStep: next.onboarding.step + 1,
          partialPreferences: canonicalPreferences(next.onboarding),
          profileVisibility: canonicalVisibility(next.onboarding.privacy),
        }),
      );
    }
    return toLegacyAccount(
      await this.change(
        identity,
        'profile',
        expectedRevision,
        (user, profile) => ({
          user,
          profile: { ...profile, displayName: next.displayName, bio: next.bio },
        }),
      ),
    );
  }
}
