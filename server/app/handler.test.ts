// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { apiHandler } from './handler';
let server: Server;
let base: string;
beforeAll(async () => {
  vi.stubEnv('APP_ENV', 'development');
  server = createServer(apiHandler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No server address');
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  vi.unstubAllEnvs();
});
describe('API over HTTP', () => {
  it('GET health returns 200 with current metadata', async () => {
    const before = Date.now();
    const response = await fetch(`${base}/api/v1/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body).toMatchObject({
      status: 'ok',
      environment: 'development',
      version: '0.1.0',
    });
    expect(Date.parse(body.timestamp)).toBeGreaterThanOrEqual(before);
  });
  it.each(['/api/v1/playlists/inspect', '/api/v1/programs/import'])(
    'POST %s returns explicit 501',
    async (path) => {
      const response = await fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.youtube.com/playlist?list=example',
        }),
      });
      expect(response.status).toBe(501);
      expect(await response.json()).toEqual({
        code: 'not-implemented',
        userMessageKey: 'errors.notImplemented',
        retryable: false,
        details: {},
      });
    },
  );
  it('unknown paths and unsupported methods return the standard error', async () => {
    for (const [method, path] of [
      ['GET', '/api/v1/missing'],
      ['POST', '/api/v1/health'],
    ]) {
      const response = await fetch(base + path, { method });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        code: 'not-found',
        userMessageKey: 'common.notFound',
        retryable: false,
        details: {},
      });
    }
  });
});
