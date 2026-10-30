import {
  accountSchema,
  type Account,
  type AccountOnboarding,
  type ProfileInput,
} from '../../../shared/account';
import type { AuthDriver } from '../firebase/auth';
import { ApiRequestError } from './client';
export class AccountClient {
  private account: Account | null = null;
  private listeners = new Set<(account: Account) => void>();
  constructor(
    private readonly auth: AuthDriver,
    private readonly uid: string,
  ) {}
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
  private async request(method: string, path: string, data?: unknown) {
    const token = await this.auth.getToken(this.uid);
    const response = await fetch(`/api/v1/me${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(data ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new ApiRequestError({
        code: 'invalid-response',
        userMessageKey: 'account.unavailable',
        retryable: true,
      });
    }
    if (!response.ok) {
      const error =
        typeof raw === 'object' &&
        raw &&
        'code' in raw &&
        typeof raw.code === 'string'
          ? raw.code
          : 'account-unavailable';
      if (response.status === 409) await this.load();
      throw new ApiRequestError({
        code: error,
        userMessageKey:
          response.status === 409
            ? 'account.conflict'
            : response.status === 401
              ? 'auth.sessionExpired'
              : 'account.unavailable',
        retryable: response.status !== 401,
      });
    }
    const parsed = accountSchema.safeParse(
      typeof raw === 'object' && raw && 'account' in raw ? raw.account : null,
    );
    if (!parsed.success || parsed.data.uid !== this.uid)
      throw new ApiRequestError({
        code: 'invalid-response',
        userMessageKey: 'account.unavailable',
        retryable: true,
      });
    this.account = parsed.data;
    for (const listener of this.listeners) listener(this.snapshot());
    return this.snapshot();
  }
  load() {
    return this.request('GET', '');
  }
  saveOnboarding(onboarding: AccountOnboarding) {
    return this.request('PUT', '/onboarding', {
      expectedRevision: this.snapshot().revision,
      onboarding,
    });
  }
  saveProfile(profile: ProfileInput) {
    return this.request('PATCH', '/profile', {
      expectedRevision: this.snapshot().revision,
      profile,
    });
  }
}
