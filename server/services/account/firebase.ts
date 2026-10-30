import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFirebaseConfig } from '../../config/firebase.js';
import {
  accountSchema,
  newOnboarding,
  type Account,
} from '../../../shared/account.js';
import {
  AccountError,
  type AccountServices,
  type Identity,
} from './contracts.js';
function getAdmin() {
  const { projectId, serviceAccount } = readFirebaseConfig();
  if (
    process.env.NODE_ENV === 'production' &&
    (process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_HOST)
  )
    throw new AccountError(
      503,
      'unsafe-emulator-config',
      'account.unavailable',
    );
  const existing = getApps().find((app) => app.name === 'flowcircle-server');
  if (existing) return existing;
  try {
    const credential = serviceAccount
      ? cert(serviceAccount)
      : applicationDefault();
    return initializeApp({ projectId, credential }, 'flowcircle-server');
  } catch {
    throw new AccountError(
      503,
      'firebase-admin-init-failed',
      'account.unavailable',
      true,
    );
  }
}
function createAccount(identity: Identity): Account {
  const timestamp = new Date().toISOString();
  return {
    uid: identity.uid,
    displayName: (identity.name?.trim() || 'FlowCircle').slice(0, 80),
    bio: '',
    username: `user_${identity.uid}`,
    onboarding: newOnboarding(),
    revision: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
export const firebaseAccountServices: AccountServices = {
  async verifyToken(token) {
    const app = getAdmin();
    try {
      const decoded = await getAuth(app).verifyIdToken(token, true);
      return {
        uid: decoded.uid,
        ...(typeof decoded.name === 'string' ? { name: decoded.name } : {}),
      };
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String(error.code)
          : '';
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
        throw new AccountError(401, 'invalid-token', 'auth.sessionExpired');
      throw new AccountError(
        503,
        'auth-unavailable',
        'account.unavailable',
        true,
      );
    }
  },
  store: {
    async getOrCreate(identity) {
      const db = getFirestore(getAdmin());
      const ref = db
        .collection('accounts')
        .doc(encodeURIComponent(identity.uid));
      return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (snapshot.exists) {
          const account = accountSchema.parse(snapshot.data());
          if (account.uid !== identity.uid)
            throw new AccountError(
              500,
              'account-integrity',
              'account.unavailable',
            );
          return account;
        }
        const account = createAccount(identity);
        tx.create(ref, account);
        return account;
      });
    },
    async update(identity, expectedRevision, change) {
      const db = getFirestore(getAdmin());
      const ref = db
        .collection('accounts')
        .doc(encodeURIComponent(identity.uid));
      return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists)
          throw new AccountError(
            409,
            'account-conflict',
            'account.conflict',
            true,
          );
        const current = accountSchema.parse(snapshot.data());
        if (current.uid !== identity.uid)
          throw new AccountError(
            500,
            'account-integrity',
            'account.unavailable',
          );
        if (current.revision !== expectedRevision)
          throw new AccountError(
            409,
            'account-conflict',
            'account.conflict',
            true,
          );
        const next = accountSchema.parse({
          ...change(current),
          uid: current.uid,
          username: current.username,
          createdAt: current.createdAt,
          revision: current.revision + 1,
          updatedAt: new Date().toISOString(),
        });
        tx.set(ref, next);
        return next;
      });
    },
  },
};
