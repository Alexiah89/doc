// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { newOnboarding } from '../../../shared/account';
const mock = vi.hoisted(() => ({
  verify: vi.fn(),
  txGet: vi.fn(),
  txCreate: vi.fn(),
  txSet: vi.fn(),
  doc: vi.fn(() => ({})),
  run: vi.fn(),
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
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({ doc: mock.doc }),
    runTransaction: mock.run,
  }),
}));
import { firebaseAccountServices } from './firebase';
const stored = () => ({
  uid: 'user-a',
  displayName: 'Alex',
  bio: '',
  username: 'user_a',
  onboarding: newOnboarding(),
  revision: 2,
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('FIREBASE_PROJECT_ID', 'test-project');
  mock.run.mockImplementation((callback) =>
    callback({ get: mock.txGet, create: mock.txCreate, set: mock.txSet }),
  );
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
  it('rejects revoked tokens without exposing the SDK error', async () => {
    mock.verify.mockRejectedValue({
      code: 'auth/id-token-revoked',
      message: 'internal details',
    });
    await expect(
      firebaseAccountServices.verifyToken('test-only-token'),
    ).rejects.toMatchObject({ status: 401, code: 'invalid-token' });
  });
  it('creates a private account inside a transaction and encodes the UID path', async () => {
    mock.txGet.mockResolvedValue({ exists: false });
    const account = await firebaseAccountServices.store.getOrCreate({
      uid: 'user/a',
      name: 'Alex',
    });
    expect(mock.doc).toHaveBeenCalledWith('user%2Fa');
    expect(mock.run).toHaveBeenCalledTimes(1);
    expect(mock.txCreate).toHaveBeenCalledTimes(1);
    expect(account.onboarding.privacy).toBe('private');
    expect(account.revision).toBe(0);
  });
  it('rejects stale writes before updating Firestore', async () => {
    mock.txGet.mockResolvedValue({ exists: true, data: stored });
    await expect(
      firebaseAccountServices.store.update({ uid: 'user-a' }, 1, (a) => a),
    ).rejects.toMatchObject({ status: 409 });
    expect(mock.txSet).not.toHaveBeenCalled();
  });
  it('increments revisions transactionally and preserves server identity fields', async () => {
    mock.txGet.mockResolvedValue({ exists: true, data: stored });
    const account = await firebaseAccountServices.store.update(
      { uid: 'user-a' },
      2,
      (a) => ({
        ...a,
        uid: 'forged',
        username: 'forged',
        revision: 99,
        displayName: 'Updated',
      }),
    );
    expect(account).toMatchObject({
      uid: 'user-a',
      username: 'user_a',
      revision: 3,
      displayName: 'Updated',
    });
    expect(mock.txSet).toHaveBeenCalledTimes(1);
  });
  it('fails closed on missing project config or production emulator settings', async () => {
    vi.stubEnv('FIREBASE_PROJECT_ID', '');
    await expect(
      firebaseAccountServices.verifyToken('test'),
    ).rejects.toMatchObject({ status: 503 });
    vi.stubEnv('FIREBASE_PROJECT_ID', 'test-project');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', 'localhost:8080');
    await expect(
      firebaseAccountServices.verifyToken('test'),
    ).rejects.toMatchObject({ status: 503 });
    expect(mock.verify).not.toHaveBeenCalled();
  });
});
