import {
  onboardingUpdateSchema,
  profileUpdateSchema,
} from '../../shared/account.js';
import {
  AccountError,
  type AccountServices,
} from '../services/account/contracts.js';
import type { Account } from '../../shared/account.js';
function legacyReply(account: Account) {
  const {
    uid,
    displayName,
    bio,
    username,
    onboarding,
    revision,
    createdAt,
    updatedAt,
  } = account;
  return {
    uid,
    displayName,
    bio,
    username,
    onboarding,
    revision,
    createdAt,
    updatedAt,
  };
}
import type { ApiResponse } from '../types/index.js';
export async function accountRoute(
  method: string,
  path: string,
  authorization: string | undefined,
  body: unknown,
  services: AccountServices,
): Promise<ApiResponse> {
  if (!authorization?.startsWith('Bearer ') || authorization.length > 8192)
    throw new AccountError(401, 'unauthorized', 'auth.loginRequired');
  const token = authorization.slice(7);
  if (!token || /\s/.test(token))
    throw new AccountError(401, 'unauthorized', 'auth.loginRequired');
  const identity = await services.verifyToken(token);
  if (method === 'GET' && path === '/api/v1/me')
    return {
      status: 200,
      body: {
        account: legacyReply(await services.store.getOrCreate(identity)),
      },
    };
  if (method === 'PUT' && path === '/api/v1/me/onboarding') {
    const input = onboardingUpdateSchema.safeParse(body);
    if (!input.success)
      throw new AccountError(400, 'invalid-input', 'account.invalidInput');
    const account = await services.store.update(
      identity,
      input.data.expectedRevision,
      (current) => ({ ...current, onboarding: input.data.onboarding }),
    );
    return { status: 200, body: { account: legacyReply(account) } };
  }
  if (method === 'PATCH' && path === '/api/v1/me/profile') {
    const input = profileUpdateSchema.safeParse(body);
    if (!input.success)
      throw new AccountError(400, 'invalid-input', 'account.invalidInput');
    const account = await services.store.update(
      identity,
      input.data.expectedRevision,
      (current) => ({ ...current, ...input.data.profile }),
    );
    return { status: 200, body: { account: legacyReply(account) } };
  }
  throw new AccountError(405, 'method-not-allowed', 'errors.unexpected');
}
