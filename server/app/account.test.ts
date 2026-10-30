// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { createApiHandler } from './handler';
import {
  AccountError,
  type AccountServices,
} from '../services/account/contracts';
import { newOnboarding, type Account } from '../../shared/account';
const records = new Map<string, Account>();
const services: AccountServices = {
  async verifyToken(token) {
    if (token === 'test-token-a') return { uid: 'user-a', name: 'Alex' };
    if (token === 'test-token-b') return { uid: 'user-b', name: 'Sam' };
    throw new AccountError(401, 'invalid-token', 'auth.sessionExpired');
  },
  store: {
    async getOrCreate(identity) {
      let account = records.get(identity.uid);
      if (!account) {
        const now = new Date().toISOString();
        account = {
          uid: identity.uid,
          displayName: identity.name ?? '',
          bio: '',
          username: `user_${identity.uid}`,
          onboarding: newOnboarding(),
          revision: 0,
          createdAt: now,
          updatedAt: now,
        };
        records.set(identity.uid, account);
      }
      return structuredClone(account);
    },
    async update(identity, revision, change) {
      const current = records.get(identity.uid);
      if (!current || current.revision !== revision)
        throw new AccountError(
          409,
          'account-conflict',
          'account.conflict',
          true,
        );
      const next = {
        ...change(structuredClone(current)),
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
      };
      records.set(identity.uid, next);
      return structuredClone(next);
    },
  },
};
let server: Server;
let base: string;
beforeAll(async () => {
  server = createServer(createApiHandler(services));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw Error('No address');
  base = `http://127.0.0.1:${addr.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => records.clear());
async function call(
  path = '/api/v1/me',
  method = 'GET',
  data?: unknown,
  token = 'test-token-a',
) {
  return fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
describe('Protected account API (injected identity and store)', () => {
  it('requires authentication and rejects invalid tokens', async () => {
    expect((await fetch(base + '/api/v1/me')).status).toBe(401);
    expect((await call('/api/v1/me', 'GET', undefined, 'invalid')).status).toBe(
      401,
    );
    expect(records.size).toBe(0);
  });
  it('creates a private account once and preserves its identity', async () => {
    const first = await call();
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.account).toMatchObject({
      uid: 'user-a',
      displayName: 'Alex',
      revision: 0,
      onboarding: { privacy: 'private', completed: false },
    });
    expect((await (await call()).json()).account).toEqual(body.account);
    expect(records.size).toBe(1);
  });
  it('saves progress through four onboarding steps and restores it on another request', async () => {
    await call();
    const state = newOnboarding();
    state.preferences.activities = ['Yoga'];
    state.step = 1;
    let response = await call('/api/v1/me/onboarding', 'PUT', {
      expectedRevision: 0,
      onboarding: state,
    });
    expect(response.status).toBe(200);
    state.step = 3;
    state.completed = true;
    response = await call('/api/v1/me/onboarding', 'PUT', {
      expectedRevision: 1,
      onboarding: state,
    });
    expect(response.status).toBe(200);
    const restored = await (await call()).json();
    expect(restored.account.onboarding).toEqual(state);
    expect(restored.account.revision).toBe(2);
  });
  it('never accepts another UID or unknown sensitive fields from the client', async () => {
    await call();
    for (const payload of [
      { expectedRevision: 0, uid: 'user-b', onboarding: newOnboarding() },
      {
        expectedRevision: 0,
        onboarding: { ...newOnboarding(), notes: 'publish me' },
      },
      {
        expectedRevision: 0,
        onboarding: {
          ...newOnboarding(),
          preferences: {
            ...newOnboarding().preferences,
            activities: ['unknown'],
          },
        },
      },
    ]) {
      expect((await call('/api/v1/me/onboarding', 'PUT', payload)).status).toBe(
        400,
      );
    }
    expect(records.get('user-a')?.revision).toBe(0);
    expect(records.has('user-b')).toBe(false);
  });
  it('keeps users isolated and rejects stale writes from a second device', async () => {
    await call();
    await call('/api/v1/me', 'GET', undefined, 'test-token-b');
    expect(
      (
        await call('/api/v1/me/profile', 'PATCH', {
          expectedRevision: 0,
          profile: { displayName: 'Updated', bio: 'Private bio' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call('/api/v1/me/profile', 'PATCH', {
          expectedRevision: 0,
          profile: { displayName: 'Stale', bio: '' },
        })
      ).status,
    ).toBe(409);
    expect(records.get('user-a')?.displayName).toBe('Updated');
    expect(records.get('user-b')?.displayName).toBe('Sam');
  });
  it('validates profile length and rejects missing revisions', async () => {
    await call();
    for (const body of [
      { profile: { displayName: 'Alex', bio: '' } },
      { expectedRevision: 0, profile: { displayName: ' ', bio: '' } },
      {
        expectedRevision: 0,
        profile: { displayName: 'Alex', bio: 'a'.repeat(281) },
      },
    ])
      expect((await call('/api/v1/me/profile', 'PATCH', body)).status).toBe(
        400,
      );
  });
  it('limits request size and requires JSON', async () => {
    expect(
      (await call('/api/v1/me/profile', 'PATCH', { value: 'x'.repeat(9000) }))
        .status,
    ).toBe(413);
    const response = await fetch(base + '/api/v1/me/profile', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer test-token-a',
        'Content-Type': 'text/plain',
      },
      body: '{}',
    });
    expect(response.status).toBe(415);
    const invalid = await fetch(base + '/api/v1/me/profile', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer test-token-a',
        'Content-Type': 'application/json',
      },
      body: '{bad',
    });
    expect(invalid.status).toBe(400);
  });
  it('returns a safe standard error if persistence fails', async () => {
    const failing = {
      ...services,
      store: {
        ...services.store,
        async getOrCreate(): Promise<Account> {
          throw Error('private-database-details');
        },
      },
    };
    const temporary = createServer(createApiHandler(failing));
    await new Promise<void>((resolve) =>
      temporary.listen(0, '127.0.0.1', resolve),
    );
    try {
      const addr = temporary.address();
      if (!addr || typeof addr === 'string') throw Error('No address');
      const response = await fetch(`http://127.0.0.1:${addr.port}/api/v1/me`, {
        headers: { Authorization: 'Bearer test-token-a' },
      });
      expect(response.status).toBe(500);
      expect(JSON.stringify(await response.json())).not.toContain(
        'private-database-details',
      );
    } finally {
      await new Promise<void>((resolve) => temporary.close(() => resolve()));
    }
  });
});
