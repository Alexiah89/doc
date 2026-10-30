import {
  draftPatchSchema,
  completionSchema,
  preferencesPatchSchema,
  privacyPatchSchema,
} from '../../shared/users.js';
import { requireFirebaseAuth } from '../middleware/auth.js';
import {
  AccountError,
  type AccountServices,
} from '../services/account/contracts.js';
import type { ApiResponse } from '../types/index.js';
async function dispatchUsers(
  method: string,
  path: string,
  authorization: string | undefined,
  body: unknown,
  services: AccountServices,
): Promise<ApiResponse> {
  const { identity } = await requireFirebaseAuth(authorization, services);
  const users = services.users;
  if (!users)
    throw new AccountError(
      503,
      'firebase-not-configured',
      'errors.firebase-not-configured',
      true,
    );
  if (method === 'POST' && path === '/api/v1/users/bootstrap')
    return { status: 200, body: await users.bootstrap(identity) };
  if (method === 'GET' && path === '/api/v1/users/me')
    return { status: 200, body: await users.read(identity) };
  if (method === 'PATCH' && path === '/api/v1/users/me/onboarding') {
    const input = draftPatchSchema.safeParse(body);
    if (!input.success) {
      const invalidStep =
        (typeof body === 'object' &&
          body &&
          'currentStep' in body &&
          !Number.isInteger(body.currentStep)) ||
        (typeof body === 'object' &&
          body &&
          'currentStep' in body &&
          (Number(body.currentStep) < 1 || Number(body.currentStep) > 4));
      throw new AccountError(
        400,
        invalidStep
          ? 'onboarding-invalid-step'
          : 'onboarding-invalid-selection',
        invalidStep
          ? 'errors.onboarding-invalid-step'
          : 'errors.onboarding-invalid-selection',
      );
    }
    return { status: 200, body: await users.saveDraft(identity, input.data) };
  }
  if (method === 'POST' && path === '/api/v1/users/me/onboarding/complete') {
    const input = completionSchema.safeParse(body);
    if (!input.success)
      throw new AccountError(
        400,
        'validation-error',
        'errors.validation-error',
      );
    return { status: 200, body: await users.complete(identity, input.data) };
  }
  if (method === 'PATCH' && path === '/api/v1/users/me/preferences') {
    const input = preferencesPatchSchema.safeParse(body);
    if (!input.success)
      throw new AccountError(
        400,
        'validation-error',
        'errors.validation-error',
      );
    return { status: 200, body: await users.preferences(identity, input.data) };
  }
  if (method === 'PATCH' && path === '/api/v1/users/me/privacy') {
    const input = privacyPatchSchema.safeParse(body);
    if (!input.success)
      throw new AccountError(
        400,
        'validation-error',
        'errors.validation-error',
      );
    return { status: 200, body: await users.privacy(identity, input.data) };
  }
  throw new AccountError(405, 'method-not-allowed', 'errors.unexpected');
}

export async function usersRoute(
  ...args: Parameters<typeof dispatchUsers>
): Promise<ApiResponse> {
  try {
    return await dispatchUsers(...args);
  } catch (error) {
    if (error instanceof AccountError) throw error;
    if (args[1] === '/api/v1/users/bootstrap')
      throw new AccountError(
        503,
        'user-bootstrap-failed',
        'errors.user-bootstrap-failed',
        true,
      );
    if (args[1].includes('/onboarding'))
      throw new AccountError(
        500,
        'onboarding-save-failed',
        'errors.onboarding-save-failed',
        true,
      );
    throw new AccountError(
      500,
      'internal-error',
      'errors.internal-error',
      true,
    );
  }
}
