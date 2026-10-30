// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiHandler } from './handler';
import { newOnboarding, type Account } from '../../shared/account';
import type { AccountServices } from '../services/account/contracts';
const account = (): Account => ({
  uid: 'test-user',
  displayName: 'Alex',
  username: 'user_test',
  bio: '',
  onboarding: newOnboarding(),
  revision: 0,
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
});
const services: AccountServices = {
  async verifyToken() {
    return { uid: 'test-user' };
  },
  store: {
    async getOrCreate() {
      return account();
    },
    async update(_identity, _revision, change) {
      return { ...change(account()), revision: 1 };
    },
  },
};
let server: Server;
let base: string;
beforeAll(async () => {
  const handler = createApiHandler(services);
  server = createServer(async (req, res) => {
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const chunks: Buffer[] = [];
      for await (const chunk of req)
        chunks.push(Buffer.from(chunk as Uint8Array));
      (req as IncomingMessage & { body: unknown }).body = JSON.parse(
        Buffer.concat(chunks).toString('utf8'),
      );
    }
    await handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No server address');
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
async function update(path: string, method: string, body: unknown) {
  return fetch(base + path, {
    method,
    headers: {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
describe('Vercel-style pre-parsed request bodies', () => {
  it('saves onboarding after the platform already consumed and parsed the JSON stream', async () => {
    const onboarding = {
      ...newOnboarding(),
      preferences: { ...newOnboarding().preferences, activities: ['Yoga'] },
    };
    const response = await update('/api/v1/me/onboarding', 'PUT', {
      expectedRevision: 0,
      onboarding,
    });
    expect(response.status).toBe(200);
    expect(
      (await response.json()).account.onboarding.preferences.activities,
    ).toEqual(['Yoga']);
  });
  it('updates profile with a pre-parsed body', async () => {
    const response = await update('/api/v1/me/profile', 'PATCH', {
      expectedRevision: 0,
      profile: { displayName: 'Alexandra', bio: 'Yoga' },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).account.displayName).toBe('Alexandra');
  });
  it('still rejects oversized or invalid schema inputs', async () => {
    expect(
      (
        await update('/api/v1/me/onboarding', 'PUT', {
          expectedRevision: 0,
          onboarding: { ...newOnboarding(), uid: 'another-user' },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await update('/api/v1/me/profile', 'PATCH', {
          expectedRevision: 0,
          profile: { displayName: 'Alex', bio: 'a'.repeat(9000) },
        })
      ).status,
    ).toBe(413);
  });
  it('does not double-decode JSON strings into trusted request objects', async () => {
    const input = JSON.stringify({
      expectedRevision: 0,
      onboarding: newOnboarding(),
    });
    expect((await update('/api/v1/me/onboarding', 'PUT', input)).status).toBe(
      400,
    );
  });
});
