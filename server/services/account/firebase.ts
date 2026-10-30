import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '../firebaseAdmin.js';
import { AccountError, type AccountServices } from './contracts.js';
import { UserAccountService } from './users.js';
import { firestoreDatabase } from './database.js';
const users = new UserAccountService(firestoreDatabase());
export const firebaseAccountServices: AccountServices = {
  async verifyToken(token) {
    const app = getFirebaseAdmin();
    try {
      const decoded = await getAuth(app).verifyIdToken(token, true);
      return {
        uid: decoded.uid,
        ...(typeof decoded.name === 'string' ? { name: decoded.name } : {}),
        ...(typeof decoded.picture === 'string'
          ? { photoUrl: decoded.picture }
          : {}),
        ...(typeof decoded.email_verified === 'boolean'
          ? { emailVerified: decoded.email_verified }
          : {}),
      };
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String(error.code)
          : '';
      if (code === 'auth/user-disabled')
        throw new AccountError(
          403,
          'account-disabled',
          'errors.account-disabled',
        );
      if (
        [
          'auth/id-token-expired',
          'auth/id-token-revoked',
          'auth/argument-error',
          'auth/invalid-id-token',
          'auth/user-disabled',
          'auth/user-not-found',
        ].includes(code)
      )
        throw new AccountError(
          401,
          'invalid-auth-token',
          'errors.invalid-auth-token',
        );
      throw new AccountError(
        503,
        'auth-unavailable',
        'account.unavailable',
        true,
      );
    }
  },
  users,
  store: {
    getOrCreate: (identity) => users.legacyRead(identity),
    update: (identity, revision, change) =>
      users.legacyUpdate(identity, revision, change),
  },
};
