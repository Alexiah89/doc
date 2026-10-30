import { health } from '../services/health.js';
import type { ApiResponse } from '../types/index.js';
export function dispatch(method: string, path: string): ApiResponse {
  if (method === 'GET' && path === '/api/v1/health')
    return { status: 200, body: health() };
  if (
    method === 'POST' &&
    ['/api/v1/playlists/inspect', '/api/v1/programs/import'].includes(path)
  )
    return {
      status: 501,
      body: {
        code: 'not-implemented',
        userMessageKey: 'errors.notImplemented',
        retryable: false,
        details: {},
      },
    };
  return {
    status: 404,
    body: {
      code: 'not-found',
      userMessageKey: 'common.notFound',
      retryable: false,
      details: {},
    },
  };
}
