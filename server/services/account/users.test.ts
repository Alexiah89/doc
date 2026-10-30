// @vitest-environment node
import { beforeEach, describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { MemoryDatabase } from '../../test/memoryDatabase';
import { UserAccountService, usernameBase } from './users';
import type { UserDocument, UserProfileDocument } from './documents';
import { defaultPreferences } from '../../../shared/users';
import { newOnboarding } from '../../../shared/account';
let db: MemoryDatabase;
let service: UserAccountService;
const alex = { uid: 'test-alex', name: 'Alexandra' };
beforeEach(() => {
  db = new MemoryDatabase();
  service = new UserAccountService(db);
});
function user(uid = alex.uid) {
  return db.docs.get(`users/${uid}`) as UserDocument;
}
function profile(uid = alex.uid) {
  return db.docs.get(`profiles/${uid}`) as UserProfileDocument;
}
describe('Persistent user architecture', () => {
  it('does not silently replace an unrecognized legacy document with empty defaults', async () => {
    db.docs.set('accounts/' + alex.uid, {
      uid: alex.uid,
      unknownPrivateData: 'retained',
    });
    await expect(service.bootstrap(alex)).rejects.toMatchObject({
      code: 'user-bootstrap-failed',
    });
    expect(db.count('users')).toBe(0);
    expect(db.docs.get('accounts/' + alex.uid)).toEqual({
      uid: alex.uid,
      unknownPrivateData: 'retained',
    });
  });

  it('atomically bootstraps private user, profile, username and a safe audit event', async () => {
    await service.bootstrap(alex);
    expect(user()).toMatchObject({
      userId: alex.uid,
      role: 'user',
      accountStatus: 'active',
      onboardingStatus: 'not_started',
      privacySettings: {
        profileVisibility: 'private',
        progressVisibility: 'private',
        notes: 'private',
      },
    });
    expect(user().createdAt).toBeInstanceOf(Timestamp);
    expect(profile()).toMatchObject({
      username: 'alexandra',
      normalizedUsername: 'alexandra',
      profileVisibility: 'private',
      followerCount: 0,
      followingCount: 0,
      circleCount: 0,
    });
    expect(db.count('usernames')).toBe(1);
    expect(db.count('auditLogs')).toBe(1);
  });
  it('is idempotent under ten concurrent bootstrap requests', async () => {
    await Promise.all(
      Array.from({ length: 10 }, () => service.bootstrap(alex)),
    );
    expect(db.count('users')).toBe(1);
    expect(db.count('profiles')).toBe(1);
    expect(db.count('usernames')).toBe(1);
    expect(db.count('auditLogs')).toBe(1);
  });
  it('reserves unique names transactionally without email or UID disclosure', async () => {
    await Promise.all([
      service.bootstrap(alex),
      service.bootstrap({ uid: 'another', name: 'Alexandra' }),
      service.bootstrap({ uid: 'uid-123', name: 'uid-123' }),
      service.bootstrap({ uid: 'mail-user', name: 'person@example.com' }),
    ]);
    expect(
      new Set(
        [...db.docs]
          .filter(([p]) => p.startsWith('profiles/'))
          .map(([, p]) => (p as UserProfileDocument).username),
      ).size,
    ).toBe(4);
    expect(profile('uid-123').username).not.toContain('uid-123');
    expect(profile('mail-user').username).not.toContain('example');
    expect(usernameBase('  Änne Müller ', 'test')).toBe('anne-muller');
  });
  it('migrates a completed legacy account without losing preferences or exposing UID username', async () => {
    const state = {
      ...newOnboarding(),
      step: 3,
      completed: true,
      privacy: 'followers' as const,
      preferences: {
        ...newOnboarding().preferences,
        activities: ['Yoga' as const],
      },
    };
    db.docs.set(`accounts/${alex.uid}`, {
      uid: alex.uid,
      displayName: 'Alexandra',
      bio: 'My bio',
      username: `user_${alex.uid}`,
      onboarding: state,
      revision: 3,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    });
    await service.bootstrap(alex);
    expect(user().onboardingStatus).toBe('completed');
    expect(user().onboardingDraft).toBeNull();
    expect(profile()).toMatchObject({
      interests: ['yoga'],
      profileVisibility: 'protected',
      bio: 'My bio',
      username: 'alexandra',
    });
    expect(db.docs.has(`accounts/${alex.uid}`)).toBe(true);
    const view = await service.legacyRead(alex);
    expect(view.onboarding).toMatchObject({
      completed: true,
      privacy: 'followers',
      preferences: { activities: ['Yoga'] },
    });
  });
  it('saves all four steps, preserves partial fields and resumes from the server', async () => {
    await service.bootstrap(alex);
    await service.saveDraft(alex, {
      currentStep: 1,
      partialPreferences: { activityTypes: ['yoga'] },
    });
    await service.saveDraft(alex, {
      currentStep: 2,
      partialPreferences: {
        preferredSessionDuration: '15_25',
        preferredFrequency: '3_per_week',
      },
    });
    await service.saveDraft(alex, {
      currentStep: 3,
      partialPreferences: { trainingFocus: ['relaxation'] },
    });
    await service.saveDraft(alex, {
      currentStep: 4,
      profileVisibility: 'protected',
    });
    const resumed = await new UserAccountService(db).read(alex);
    expect(resumed.account.onboardingStatus).toBe('in_progress');
    expect(resumed.onboarding).toMatchObject({
      currentStep: 4,
      draft: {
        currentStep: 4,
        preferences: {
          activityTypes: ['yoga'],
          preferredSessionDuration: '15_25',
          preferredFrequency: '3_per_week',
          trainingFocus: ['relaxation'],
        },
        profileVisibility: 'protected',
      },
    });
    expect(profile().profileVisibility).toBe('private');
  });
  it('completes idempotently, clears draft, applies interests and audits exactly once', async () => {
    await service.bootstrap(alex);
    const input = {
      expectedRevision: 0,
      preferences: {
        ...defaultPreferences(),
        activityTypes: ['yoga' as const],
      },
      profileVisibility: 'public' as const,
    };
    const first = await service.complete(alex, input);
    const second = await service.complete(alex, input);
    expect(second).toEqual(first);
    expect(user()).toMatchObject({
      onboardingStatus: 'completed',
      onboardingCurrentStep: null,
      onboardingDraft: null,
    });
    expect(profile()).toMatchObject({
      interests: ['yoga'],
      profileVisibility: 'public',
    });
    expect(db.count('auditLogs')).toBe(3);
    const serialized = JSON.stringify(
      [...db.docs].filter(([p]) => p.startsWith('auditLogs/')),
    );
    for (const forbidden of [
      'Authorization',
      'Bearer',
      'private_key',
      'preferredSessionDuration',
      'My bio',
    ])
      expect(serialized).not.toContain(forbidden);
  });
  it('blocks suspended, deleted and deletion-pending accounts on reads and writes', async () => {
    await service.bootstrap(alex);
    for (const status of [
      'suspended',
      'deleted',
      'deletion_pending',
    ] as const) {
      db.docs.set(`users/${alex.uid}`, { ...user(), accountStatus: status });
      expect((await service.bootstrap(alex)).account.accountStatus).toBe(
        status,
      );
      await expect(service.read(alex)).rejects.toMatchObject({ status: 403 });
      await expect(
        service.saveDraft(alex, { currentStep: 1 }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        service.complete(alex, {
          preferences: defaultPreferences(),
          profileVisibility: 'private',
        }),
      ).rejects.toMatchObject({ status: 403 });
    }
  });
  it('retains newer data on stale revisions and keeps roles server-owned', async () => {
    await service.bootstrap(alex);
    await service.preferences(alex, {
      expectedRevision: 0,
      activityTypes: ['mobility'],
      locale: 'en-US',
    });
    await expect(
      service.privacy(alex, {
        expectedRevision: 0,
        profileVisibility: 'public',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(user().role).toBe('user');
    expect(user().locale).toBe('en-US');
    expect(profile().interests).toEqual(['mobility']);
  });
  it('protects normal reloads while applying a durable per-user rate window', async () => {
    await Promise.all(
      Array.from({ length: 12 }, () => service.bootstrap(alex)),
    );
    for (let i = 0; i < 48; i++) await service.bootstrap(alex);
    await expect(service.bootstrap(alex)).rejects.toMatchObject({
      status: 429,
      code: 'rate-limit-exceeded',
    });
    await expect(
      service.bootstrap({ uid: 'another-user', name: 'Sam' }),
    ).resolves.toBeTruthy();
  });
  it('does not return private role/audit documents in the current-user DTO', async () => {
    await service.bootstrap(alex);
    const response = await service.read(alex);
    expect(response.account).toEqual({
      userId: alex.uid,
      accountStatus: 'active',
      onboardingStatus: 'not_started',
      locale: 'de-DE',
    });
    expect(Object.keys(response)).not.toContain('auditLogs');
    expect(JSON.stringify(response)).not.toContain('"role"');
  });
});
