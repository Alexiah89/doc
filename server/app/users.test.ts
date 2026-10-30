// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiHandler } from './handler';
import { MemoryDatabase } from '../test/memoryDatabase';
import { UserAccountService } from '../services/account/users';
import {
  AccountError,
  type AccountServices,
} from '../services/account/contracts';
import { defaultPreferences } from '../../shared/users';
let db = new MemoryDatabase();
let users = new UserAccountService(db);
let server: Server;
let base: string;
const services: AccountServices = {
  async verifyToken(token) {
    if (!['test-a', 'test-b'].includes(token))
      throw new AccountError(
        401,
        'invalid-auth-token',
        'errors.invalid-auth-token',
      );
    return { uid: token === 'test-a' ? 'user-a' : 'user-b', name: 'Alex' };
  },
  get users() {
    return users;
  },
  store: {
    getOrCreate: (identity) => users.legacyRead(identity),
    update: (identity, revision, change) =>
      users.legacyUpdate(identity, revision, change),
  },
};
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
beforeEach(() => {
  db = new MemoryDatabase();
  users = new UserAccountService(db);
});
async function call(
  path: string,
  method = 'GET',
  body?: unknown,
  token = 'test-a',
) {
  return fetch(base + '/api/v1/users/' + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
describe('Sprint 2 REST API', () => {
  it('requires auth for bootstrap and rejects invalid supplied tokens', async () => {
    expect(
      (
        await fetch(base + '/api/v1/users/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(401);
    expect((await call('bootstrap', 'POST', {}, 'bad')).status).toBe(401);
    expect(db.count('users')).toBe(0);
  });
  it('bootstraps then returns only the caller’s account even with another target in the query', async () => {
    expect(
      (await call('bootstrap', 'POST', { role: 'admin', userId: 'user-b' }))
        .status,
    ).toBe(200);
    expect((await (await call('me?userId=user-b')).json()).account.userId).toBe(
      'user-a',
    );
    expect((await call('me', 'GET', undefined, 'test-b')).status).toBe(409);
  });
  it.each([
    { currentStep: 0 },
    { currentStep: 5 },
    { currentStep: 1, partialPreferences: { activityTypes: ['unknown'] } },
    { currentStep: 1, role: 'admin' },
    { currentStep: 1, partialPreferences: { email: 'private@example.com' } },
  ])('rejects invalid or non-whitelisted drafts %j', async (body) => {
    await call('bootstrap', 'POST', {});
    const response = await call('me/onboarding', 'PATCH', body);
    expect(response.status).toBe(400);
    expect((await response.json()).retryable).toBe(false);
  });
  it('persists partial updates, completes idempotently and updates preferences/privacy separately', async () => {
    await call('bootstrap', 'POST', {});
    expect(
      (
        await call('me/onboarding', 'PATCH', {
          currentStep: 2,
          partialPreferences: { activityTypes: ['yoga'] },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call('me/onboarding', 'PATCH', {
          currentStep: 3,
          partialPreferences: { trainingFocus: ['relaxation'] },
        })
      ).status,
    ).toBe(200);
    expect(
      (await (await call('me')).json()).onboarding.draft.preferences
        .activityTypes,
    ).toEqual(['yoga']);
    const input = {
      preferences: { ...defaultPreferences(), activityTypes: ['yoga'] },
      profileVisibility: 'protected',
    };
    const first = await (
      await call('me/onboarding/complete', 'POST', input)
    ).json();
    expect(
      await (await call('me/onboarding/complete', 'POST', input)).json(),
    ).toEqual(first);
    expect(
      (
        await call('me/preferences', 'PATCH', {
          locale: 'en-US',
          activityTypes: ['mobility'],
        })
      ).status,
    ).toBe(200);
    const privacy = await (
      await call('me/privacy', 'PATCH', { profileVisibility: 'private' })
    ).json();
    expect(privacy.profile.profileVisibility).toBe('private');
    expect(privacy.preferences.activityTypes).toEqual(['mobility']);
    expect(privacy.account.locale).toBe('en-US');
  });
  it('does not accept roles, private notes, ownership fields or arbitrary profile fields', async () => {
    await call('bootstrap', 'POST', {});
    for (const [path, body] of [
      ['me/preferences', { role: 'admin' }],
      ['me/privacy', { profileVisibility: 'public', userId: 'user-b' }],
      ['me/preferences', { notes: 'private' }],
    ] as const)
      expect((await call(path, 'PATCH', body)).status).toBe(400);
  });
});
