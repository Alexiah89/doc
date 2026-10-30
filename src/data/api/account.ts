import {
  accountSchema,
  type Account,
  type AccountOnboarding,
  type ProfileInput,
} from '../../../shared/account';
import {
  currentUserSchema,
  toLegacyAccount,
  canonicalPreferences,
  canonicalVisibility,
  type PreferencesPatch,
  type ProfileVisibility,
} from '../../../shared/users';
import type { AuthDriver } from '../firebase/auth';
import { ApiRequestError } from './client';
import { AuthenticatedApiClient } from './authenticated';
export class AccountClient {
  private account: Account | null = null;
  private listeners = new Set<(account: Account) => void>();
  private api: AuthenticatedApiClient;
  constructor(
    auth: AuthDriver,
    private readonly uid: string,
    onInvalidSession?: () => void,
  ) {
    this.api = new AuthenticatedApiClient(auth, uid, onInvalidSession);
  }
  dispose() {
    this.api.dispose();
    this.account = null;
    this.listeners.clear();
  }
  snapshot() {
    if (!this.account) throw Error('Account not loaded');
    return structuredClone(this.account);
  }
  subscribe(listener: (account: Account) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private accept(raw: unknown) {
    const canonical = currentUserSchema.safeParse(raw);
    const parsed = canonical.success
      ? { success: true as const, data: toLegacyAccount(canonical.data) }
      : accountSchema.safeParse(
          typeof raw === 'object' && raw && 'account' in raw
            ? raw.account
            : null,
        );
    if (!parsed.success || parsed.data.uid !== this.uid)
      throw new ApiRequestError({
        code: 'invalid-response',
        userMessageKey: 'account.unavailable',
        retryable: true,
      });
    this.account = canonical.success
      ? parsed.data
      : { ...this.account, ...parsed.data };
    for (const listener of this.listeners) listener(this.snapshot());
    return this.snapshot();
  }
  async bootstrapAndLoad() {
    const raw = await this.api.request('POST', '/api/v1/users/bootstrap', {});
    if (
      typeof raw === 'object' &&
      raw &&
      'account' in raw &&
      typeof raw.account === 'object' &&
      raw.account &&
      'accountStatus' in raw.account &&
      raw.account.accountStatus !== 'active'
    ) {
      const status = raw.account.accountStatus;
      throw new ApiRequestError({
        code:
          status === 'suspended'
            ? 'account-suspended'
            : status === 'deletion_pending'
              ? 'account-deletion-pending'
              : 'account-deleted',
        userMessageKey: 'errors.account-disabled',
        retryable: false,
      });
    }
    return this.load();
  }
  async load() {
    return this.accept(await this.api.request('GET', '/api/v1/users/me'));
  }
  private async update(method: string, path: string, data: unknown) {
    try {
      return this.accept(await this.api.request(method, path, data));
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.error.code === 'account-conflict'
      )
        await this.load();
      throw error;
    }
  }
  saveOnboarding(onboarding: AccountOnboarding) {
    const preferences = canonicalPreferences(onboarding);
    const profileVisibility = canonicalVisibility(onboarding.privacy);
    return onboarding.completed
      ? this.update('POST', '/api/v1/users/me/onboarding/complete', {
          expectedRevision: this.snapshot().revision,
          preferences,
          profileVisibility,
        })
      : this.update('PATCH', '/api/v1/users/me/onboarding', {
          expectedRevision: this.snapshot().revision,
          currentStep: onboarding.step + 1,
          partialPreferences: preferences,
          profileVisibility,
        });
  }
  saveProfile(profile: ProfileInput) {
    return this.update('PATCH', '/api/v1/me/profile', {
      expectedRevision: this.snapshot().revision,
      profile,
    });
  }
  savePreferences(input: PreferencesPatch) {
    return this.update('PATCH', '/api/v1/users/me/preferences', {
      ...input,
      expectedRevision: this.snapshot().revision,
    });
  }
  savePrivacy(profileVisibility: ProfileVisibility) {
    return this.update('PATCH', '/api/v1/users/me/privacy', {
      expectedRevision: this.snapshot().revision,
      profileVisibility,
    });
  }
}
