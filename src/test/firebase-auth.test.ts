import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  initialize: vi.fn(() => ({})),
  auth: {
    currentUser: null as null | {
      uid: string;
      getIdToken: () => Promise<string>;
    },
  },
  verifySubscribe: vi.fn(),
  popup: vi.fn(),
  logout: vi.fn(),
  persistence: vi.fn(),
}));
vi.mock('firebase/app', () => ({
  getApps: () => [],
  getApp: () => ({}),
  initializeApp: mocks.initialize,
}));
vi.mock('firebase/auth', () => ({
  getAuth: () => mocks.auth,
  GoogleAuthProvider: class {},
  onAuthStateChanged: mocks.verifySubscribe,
  setPersistence: mocks.persistence,
  browserLocalPersistence: {},
  signInWithPopup: mocks.popup,
  signOut: mocks.logout,
}));
import { createFirebaseAuth } from '../data/firebase/auth';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = null;
});
afterEach(() => vi.unstubAllEnvs());
function configure() {
  for (const [key, value] of Object.entries({
    VITE_FIREBASE_API_KEY: 'test-public-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_APP_ID: 'test-app',
  }))
    vi.stubEnv(key, value);
}
describe('Firebase Auth SDK adapter (SDK doubles)', () => {
  it('does not initialize Firebase if client configuration is incomplete', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    expect(createFirebaseAuth()).toBeNull();
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it('initializes with only the four public client values and uses the real SDK sign-in methods', async () => {
    configure();
    const driver = createFirebaseAuth()!;
    await driver.signIn();
    expect(mocks.initialize).toHaveBeenCalledWith({
      apiKey: 'test-public-key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'test-project',
      appId: 'test-app',
    });
    expect(mocks.persistence).toHaveBeenCalledTimes(1);
    expect(mocks.popup).toHaveBeenCalledTimes(1);
    await driver.signOut();
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
  it('binds tokens to the intended account, including a sign-out race', async () => {
    configure();
    let notify: ((user: typeof mocks.auth.currentUser) => void) | undefined;
    mocks.verifySubscribe.mockImplementation((_auth, callback) => {
      notify = callback;
      return () => {};
    });
    const driver = createFirebaseAuth()!;
    driver.subscribe(
      () => {},
      () => {},
    );
    const user = { uid: 'user-a', getIdToken: async () => 'test-only-token' };
    mocks.auth.currentUser = user;
    notify!(user);
    expect(await driver.getToken('user-a')).toBe('test-only-token');
    await expect(driver.getToken('user-b')).rejects.toThrow();
    user.getIdToken = async () => {
      mocks.auth.currentUser = null;
      return 'test-only-token';
    };
    await expect(driver.getToken('user-a')).rejects.toThrow(
      'Authenticated user changed',
    );
  });
});
