import { afterEach, describe, it, expect, vi } from 'vitest';
import { AuthenticatedApiClient } from '../data/api/authenticated';
import type { AuthDriver } from '../data/firebase/auth';
afterEach(() => vi.unstubAllGlobals());
function driver() {
  return {
    subscribe() {
      return () => {};
    },
    async signIn() {},
    async signOut() {},
    getToken: vi.fn(
      async (_uid?: string, _force?: boolean) => 'test-only-token',
    ),
  } satisfies AuthDriver;
}
describe('Authenticated API lifecycle', () => {
  it('refreshes exactly once after 401 and retries with the new token', async () => {
    const auth = driver();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);
    const client = new AuthenticatedApiClient(auth, 'user-a');
    expect(await client.request('GET', '/api/v1/users/me')).toEqual({
      ok: true,
    });
    expect(auth.getToken.mock.calls).toEqual([
      ['user-a', false],
      ['user-a', true],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('invalidates the session after a second 401 without a retry loop', async () => {
    const auth = driver();
    const invalid = vi.fn();
    const fetchMock = vi.fn(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new AuthenticatedApiClient(auth, 'user-a', invalid);
    await expect(
      client.request('GET', '/api/v1/users/me'),
    ).rejects.toMatchObject({ error: { code: 'invalid-auth-token' } });
    expect(invalid).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('aborts an in-flight private request when disposed and prevents further calls', async () => {
    const auth = driver();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_path: string, options: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            signal = options.signal!;
            signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      ),
    );
    const client = new AuthenticatedApiClient(auth, 'user-a');
    const pending = client.request('GET', '/api/v1/users/me');
    await Promise.resolve();
    client.dispose();
    expect(signal?.aborted).toBe(true);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      client.request('GET', '/api/v1/users/me'),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('does not retry a validation failure or expose server stacktrace text', async () => {
    const auth = driver();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ code: 'validation-error', stack: 'private-stack' }),
          { status: 400 },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new AuthenticatedApiClient(auth, 'user-a');
    try {
      await client.request('PATCH', '/api/v1/users/me/preferences', {});
      throw Error('Expected rejection');
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain('private-stack');
      expect(error).toMatchObject({ error: { code: 'validation-error' } });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
