import type { IncomingMessage, ServerResponse } from 'node:http';
import { dispatch } from '../routes/index.js';
import { accountRoute } from '../routes/account.js';
import { firebaseAccountServices } from '../services/account/firebase.js';
import {
  AccountError,
  type AccountServices,
} from '../services/account/contracts.js';
import { internalError } from '../middleware/errors.js';
const accountPaths = new Set([
  '/api/v1/me',
  '/api/v1/me/onboarding',
  '/api/v1/me/profile',
]);
async function readBody(req: IncomingMessage): Promise<unknown> {
  if (
    req.headers['content-type']?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    throw new AccountError(415, 'invalid-content-type', 'account.invalidInput');
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const value: Buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string);
    size += value.length;
    if (size <= 8192) chunks.push(value);
  }
  if (size > 8192)
    throw new AccountError(413, 'body-too-large', 'account.invalidInput');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new AccountError(400, 'invalid-json', 'account.invalidInput');
  }
}
export function createApiHandler(
  services: AccountServices = firebaseAccountServices,
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      const method = req.method ?? 'GET';
      const body =
        accountPaths.has(path) && ['PUT', 'PATCH'].includes(method)
          ? await readBody(req)
          : undefined;
      const result = accountPaths.has(path)
        ? await accountRoute(
            method,
            path,
            req.headers.authorization,
            body,
            services,
          )
        : dispatch(method, path);
      res.statusCode = result.status;
      res.end(JSON.stringify(result.body));
    } catch (error) {
      const result =
        error instanceof AccountError
          ? {
              status: error.status,
              body: {
                code: error.code,
                userMessageKey: error.userMessageKey,
                retryable: error.retryable,
                details: {},
              },
            }
          : internalError();
      res.statusCode = result.status;
      res.end(JSON.stringify(result.body));
    }
  };
}
export const apiHandler = createApiHandler();
