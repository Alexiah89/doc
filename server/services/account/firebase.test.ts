// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { newOnboarding } from '../../../shared/account';
const mock = vi.hoisted(() => ({
  verify: vi.fn(),
  docs: new Map<string, unknown>(),
}));
vi.mock('firebase-admin/app', () => ({
  applicationDefault: () => ({}),
  cert: () => ({}),
  getApps: () => [{ name: 'flowcircle-server' }],
  initializeApp: () => ({}),
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: mock.verify }),
}));
vi.mock('firebase-admin/firestore', async (importOriginal) => {
  const real =
    await importOriginal<typeof import('firebase-admin/firestore')>();
  return {
    ...real,
    getFirestore: () => ({
      doc: (path: string) => ({ path }),
      runTransaction: async (
        callback: (tx: {
          get: (ref: {
            path: string;
          }) => Promise<{ exists: boolean; data: () => unknown }>;
          create: (ref: { path: string }, v: unknown) => void;
          set: (ref: { path: string }, v: unknown) => void;
        }) => unknown,
      ) =>
        callback({
          async get(ref) {
            return {
              exists: mock.docs.has(ref.path),
              data: () => mock.docs.get(ref.path),
            };
          },
          create(ref, v) {
            if (mock.docs.has(ref.path)) throw Error('Duplicate');
            mock.docs.set(ref.path, v);
          },
          set(ref, v) {
            mock.docs.set(ref.path, v);
          },
        }),
    }),
  };
});
import { firebaseAccountServices } from './firebase';
beforeEach(() => {
  vi.clearAllMocks();
  mock.docs.clear();
  vi.stubEnv('FIREBASE_PROJECT_ID', 'test-project');
});
afterEach(() => vi.unstubAllEnvs());
describe('Firebase Admin adapter (SDK doubles)', () => {
  it('verifies tokens including revocation and uses only verified claims', async () => {
    mock.verify.mockResolvedValue({ uid: 'user-a', name: 'Alex' });
    expect(
      await firebaseAccountServices.verifyToken('test-only-token'),
    ).toEqual({ uid: 'user-a', name: 'Alex' });
    expect(mock.verify).toHaveBeenCalledWith('test-only-token', true);
  });
  it('rejects revoked tokens without exposing SDK errors', async () => {
    mock.verify.mockRejectedValue({
      code: 'auth/id-token-revoked',
      message: 'private details',
    });
    await expect(
      firebaseAccountServices.verifyToken('test-only-token'),
    ).rejects.toMatchObject({ status: 401, code: 'invalid-auth-token' });
  });
  it('creates private user/profile documents and an encoded UID path', async () => {
    const account = await firebaseAccountServices.store.getOrCreate({
      uid: 'user/a',
      name: 'Alex',
    });
    expect(mock.docs.has('users/user%2Fa')).toBe(true);
    expect(mock.docs.has('profiles/user%2Fa')).toBe(true);
    expect(account.onboarding.privacy).toBe('private');
    expect(account.username).not.toContain('user/a');
    expect(account.revision).toBe(0);
  });
  it('rejects stale updates without changing profile data', async () => {
    await firebaseAccountServices.store.getOrCreate({
      uid: 'user-a',
      name: 'Alex',
    });
    await expect(
      firebaseAccountServices.store.update({ uid: 'user-a' }, 99, (a) => ({
        ...a,
        displayName: 'Stale',
      })),
    ).rejects.toMatchObject({ status: 409 });
    const account = await firebaseAccountServices.store.getOrCreate({
      uid: 'user-a',
      name: 'Alex',
    });
    expect(account.displayName).toBe('Alex');
  });
  it('increments revisions and preserves identity and reserved username', async () => {
    const original = await firebaseAccountServices.store.getOrCreate({
      uid: 'user-a',
      name: 'Alex',
    });
    const account = await firebaseAccountServices.store.update(
      { uid: 'user-a' },
      0,
      (a) => ({
        ...a,
        uid: 'forged',
        username: 'forged',
        revision: 99,
        displayName: 'Updated',
        onboarding: newOnboarding(),
      }),
    );
    expect(account).toMatchObject({
      uid: 'user-a',
      username: original.username,
      revision: 1,
      displayName: 'Updated',
    });
  });
  it('fails closed on missing configuration or production emulators', async () => {
    vi.stubEnv('FIREBASE_PROJECT_ID', '');
    await expect(
      firebaseAccountServices.verifyToken('test'),
    ).rejects.toMatchObject({ status: 503 });
    vi.stubEnv('FIREBASE_PROJECT_ID', 'test-project');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080');
    await expect(
      firebaseAccountServices.verifyToken('test'),
    ).rejects.toMatchObject({ status: 503 });
    expect(mock.verify).not.toHaveBeenCalled();
  });
});
