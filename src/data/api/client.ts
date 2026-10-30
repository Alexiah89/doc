import type { ApiError } from '../models';
export interface HealthResponse {
  diagnostics?: {
    firebaseAdminConfigured: boolean;
    authEmulator: boolean;
    firestoreEmulator: boolean;
  };
  status: 'ok';
  environment: string;
  version: string;
  timestamp: string;
}
export class ApiRequestError extends Error {
  constructor(public readonly error: ApiError) {
    super(error.code);
  }
}
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', { signal });
  if (!response.ok)
    throw new ApiRequestError({
      code: 'health-unavailable',
      userMessageKey: 'errors.unexpected',
      retryable: true,
    });
  const body: unknown = await response.json();
  if (
    typeof body !== 'object' ||
    !body ||
    !('status' in body) ||
    body.status !== 'ok' ||
    !('environment' in body) ||
    typeof body.environment !== 'string' ||
    !('version' in body) ||
    typeof body.version !== 'string' ||
    !('timestamp' in body) ||
    typeof body.timestamp !== 'string'
  )
    throw new ApiRequestError({
      code: 'invalid-response',
      userMessageKey: 'errors.unexpected',
      retryable: true,
    });
  return body as HealthResponse;
}
