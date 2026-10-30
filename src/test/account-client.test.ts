import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountClient } from '../data/api/account';
import { newOnboarding, type Account } from '../../shared/account';
import type { AuthDriver } from '../data/firebase/auth';
const account = (revision = 0): Account => ({
  uid: 'user-a',
  displayName: 'Alex',
  username: 'user_a',
  bio: '',
  onboarding: newOnboarding(),
  revision,
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
});
const driver: AuthDriver = {
  subscribe() {
    return () => {};
  },
  async signIn() {},
  async signOut() {},
  async getToken(uid) {
    if (uid !== 'user-a') throw Error('wrong user');
    return 'test-token';
  },
};
afterEach(() => vi.unstubAllGlobals());
describe('Account API client', () => {
  it('rejects a response for a different account', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ account: { ...account(), uid: 'user-b' } }),
          ),
      ),
    );
    const client = new AccountClient(driver, 'user-a');
    await expect(client.load()).rejects.toMatchObject({
      error: { code: 'invalid-response' },
    });
    expect(() => client.snapshot()).toThrow('Account not loaded');
  });
  it('reloads a conflicting revision once and does not resubmit a stale update', async () => {
    let reads = 0;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      if (init.method === 'GET') {
        return new Response(
          JSON.stringify({ account: account(++reads === 1 ? 0 : 2) }),
        );
      }
      return new Response(JSON.stringify({ code: 'account-conflict' }), {
        status: 409,
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new AccountClient(driver, 'user-a');
    await client.load();
    await expect(
      client.saveProfile({ displayName: 'Stale', bio: '' }),
    ).rejects.toMatchObject({ error: { code: 'account-conflict' } });
    expect(client.snapshot().revision).toBe(2);
    expect(client.snapshot().displayName).toBe('Alex');
    expect(
      fetchMock.mock.calls.filter(([, init]) => init.method === 'PATCH'),
    ).toHaveLength(1);
  });
  it('propagates session expiry without accepting account data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: 'invalid-token' }), {
            status: 401,
          }),
      ),
    );
    const client = new AccountClient(driver, 'user-a');
    await expect(client.load()).rejects.toMatchObject({
      error: { userMessageKey: 'auth.sessionExpired', retryable: false },
    });
  });
  it('does not expose mutable cached account references', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ account: account() }))),
    );
    const client = new AccountClient(driver, 'user-a');
    const loaded = await client.load();
    loaded.displayName = 'Changed';
    expect(client.snapshot().displayName).toBe('Alex');
  });
});
