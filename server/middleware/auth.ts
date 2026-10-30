import {
  AccountError,
  type AccountServices,
  type Identity,
} from '../services/account/contracts.js';
export interface AuthenticatedRequestContext {
  userId: string;
  emailVerified?: boolean;
  identity: Identity;
}
export async function requireFirebaseAuth(
  header: string | undefined,
  services: AccountServices,
): Promise<AuthenticatedRequestContext> {
  const match = header?.match(/^Bearer ([^\s]+)$/i);
  if (!match || header!.length > 8192)
    throw new AccountError(401, 'unauthenticated', 'errors.unauthenticated');
  const identity = await services.verifyToken(match[1]);
  return {
    userId: identity.uid,
    identity,
    ...(identity.emailVerified === undefined
      ? {}
      : { emailVerified: identity.emailVerified }),
  };
}
export async function optionalFirebaseAuth(
  header: string | undefined,
  services: AccountServices,
): Promise<AuthenticatedRequestContext | { userId: null }> {
  if (header === undefined) return { userId: null };
  return requireFirebaseAuth(header, services);
}
