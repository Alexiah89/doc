import type { IncomingMessage, ServerResponse } from 'node:http';
import { dispatch } from '../routes/index.js';
import { internalError } from '../middleware/errors.js';
export function apiHandler(req: IncomingMessage, res: ServerResponse) {
  try {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const result = dispatch(req.method ?? 'GET', path);
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result.body));
  } catch {
    const result = internalError();
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result.body));
  }
}
