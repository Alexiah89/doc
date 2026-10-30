import type { ApiResponse } from '../types/index.js';
export function internalError(): ApiResponse {
  return {
    status: 500,
    body: {
      code: 'internal-error',
      userMessageKey: 'errors.unexpected',
      retryable: true,
      details: {},
    },
  };
}
