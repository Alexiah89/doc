import { accountErrorKeys } from '../../../shared/errors';
import type { AuthDriver } from '../firebase/auth';
import { ApiRequestError } from './client';
export class AuthenticatedApiClient {
  private controllers = new Set<AbortController>();
  private disposed = false;
  constructor(
    private auth: AuthDriver,
    private uid: string,
    private onInvalidSession: () => void = () => {},
  ) {}
  dispose() {
    this.disposed = true;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
  }
  async request(
    method: string,
    path: string,
    data?: unknown,
  ): Promise<unknown> {
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (this.disposed)
          throw new DOMException('Session ended', 'AbortError');
        let token: string;
        try {
          token = await this.auth.getToken(this.uid, attempt === 1);
        } catch {
          this.onInvalidSession();
          throw new ApiRequestError({
            code: 'invalid-auth-token',
            userMessageKey: 'auth.sessionExpired',
            retryable: false,
          });
        }
        if (this.disposed)
          throw new DOMException('Session ended', 'AbortError');
        let response: Response;
        try {
          response = await fetch(path, {
            method,
            headers: {
              Authorization: `Bearer ${token}`,
              ...(data === undefined
                ? {}
                : { 'Content-Type': 'application/json' }),
            },
            ...(data === undefined ? {} : { body: JSON.stringify(data) }),
            cache: 'no-store',
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          });
        } catch {
          if (controller.signal.aborted || this.disposed)
            throw new DOMException('Session ended', 'AbortError');
          throw new ApiRequestError({
            code: 'backend-unavailable',
            userMessageKey: 'errors.backend-unavailable',
            retryable: true,
          });
        }
        if (response.status === 401 && attempt === 0) continue;
        if (response.status === 401) {
          this.onInvalidSession();
          throw new ApiRequestError({
            code: 'invalid-auth-token',
            userMessageKey: 'auth.sessionExpired',
            retryable: false,
          });
        }
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
          const code =
            typeof raw === 'object' &&
            raw &&
            'code' in raw &&
            typeof raw.code === 'string' &&
            /^[a-z0-9-]{1,80}$/.test(raw.code)
              ? raw.code
              : 'backend-unavailable';
          throw new ApiRequestError({
            code,
            userMessageKey:
              response.status === 409
                ? 'account.conflict'
                : (accountErrorKeys[code as keyof typeof accountErrorKeys] ??
                  'account.unavailable'),
            retryable:
              response.status === 409 ||
              response.status === 429 ||
              response.status >= 500,
          });
        }
        if (this.disposed)
          throw new DOMException('Session ended', 'AbortError');
        return raw;
      }
      throw Error('Unreachable authentication retry');
    } finally {
      this.controllers.delete(controller);
    }
  }
}
