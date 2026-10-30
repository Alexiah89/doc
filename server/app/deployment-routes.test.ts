// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { apiHandler } from './handler';
let server: Server;
let base: string;
// Resolve literal Vercel function files rather than bypassing adapters with the
// local server router. This guards the exact nested paths that failed in Preview.
beforeAll(async () => {
  server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const file = resolve('api', path.replace(/^\/api\//, '') + '.ts');
    if (!path.startsWith('/api/') || !existsSync(file)) {
      res.statusCode = 404;
      res.end('Function not found');
      return;
    }
    const module = (await import(pathToFileURL(file).href)) as {
      default: typeof apiHandler;
    };
    await module.default(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No address');
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
describe('Explicit deployment entrypoints', () => {
  it('serves health through its deployed adapter', async () => {
    const response = await fetch(base + '/api/v1/health');
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe('ok');
  });
  it.each([
    ['GET', '/api/v1/me'],
    ['PUT', '/api/v1/me/onboarding'],
    ['PATCH', '/api/v1/me/profile'],
  ])('%s %s reaches the protected JSON handler', async (method, path) => {
    const response = await fetch(base + path, {
      method,
      ...(method === 'GET'
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: '{}' }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect((await response.json()).code).toBe('unauthorized');
  });
  it.each(['/api/v1/playlists/inspect', '/api/v1/programs/import'])(
    'POST %s reaches its stub',
    async (path) => {
      const response = await fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(response.status).toBe(501);
      expect((await response.json()).code).toBe('not-implemented');
    },
  );
});
