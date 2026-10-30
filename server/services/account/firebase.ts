import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId)
    throw new AccountError(
      503,
      'account-not-configured',
      'account.unavailable',
      true,
    );
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
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let credential = applicationDefault();
    if (raw) {
      const service: unknown = JSON.parse(raw);
      if (
        typeof service !== 'object' ||
        !service ||
        !('project_id' in service) ||
        service.project_id !== projectId ||
        !('client_email' in service) ||
        typeof service.client_email !== 'string' ||
        !('private_key' in service) ||
        typeof service.private_key !== 'string'
      )
        throw Error('Invalid credential configuration');
      credential = cert({
        projectId,
        clientEmail: service.client_email,
        privateKey: service.private_key,
      });
    }
    return initializeApp({ projectId, credential }, 'flowcircle-server');
  } catch {
    throw new AccountError(
      503,
      'account-not-configured',
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
