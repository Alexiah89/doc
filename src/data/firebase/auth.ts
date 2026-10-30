import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signOut,
  signInWithRedirect,
  getRedirectResult,
  connectAuthEmulator,
  type User as FirebaseUser,
} from 'firebase/auth';
export interface AuthIdentity {
  uid: string;
  displayName: string;
  photoUrl?: string | null;
  emailVerified?: boolean;
}
export interface AuthDriver {
  subscribe(
    onUser: (user: AuthIdentity | null) => void,
    onError: () => void,
  ): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  getToken(expectedUid?: string, forceRefresh?: boolean): Promise<string>;
  redirectSignIn?(): Promise<void>;
  finishRedirect?(): Promise<void>;
}
export function clientEmulatorsEnabled() {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' &&
    String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').startsWith('demo-')
  );
}
function firebaseConfig() {
  return {
    apiKey:
      import.meta.env.VITE_FIREBASE_API_KEY ||
      (clientEmulatorsEnabled() ? 'demo-key' : undefined),
    authDomain:
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
      (clientEmulatorsEnabled() ? 'localhost' : undefined),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId:
      import.meta.env.VITE_FIREBASE_APP_ID ||
      (clientEmulatorsEnabled() ? 'demo-app' : undefined),
    ...(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
      ? { messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID }
      : {}),
  };
}
export function hasFirebaseConfig() {
  return [
    firebaseConfig().apiKey,
    firebaseConfig().authDomain,
    firebaseConfig().projectId,
    firebaseConfig().appId,
  ].every((value) => typeof value === 'string' && value.length > 0);
}
export function createFirebaseAuth(): AuthDriver | null {
  if (!hasFirebaseConfig()) return null;
  let auth: ReturnType<typeof getAuth>;
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig());
    auth = getAuth(app);
    if (clientEmulatorsEnabled() && !auth.emulatorConfig)
      connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  } catch {
    return null;
  }
  let activeUser: FirebaseUser | null = null;
  return {
    subscribe(onUser, onError) {
      return onAuthStateChanged(
        auth,
        (user) => {
          activeUser = user;
          onUser(
            user
              ? {
                  uid: user.uid,
                  displayName: user.displayName ?? '',
                  photoUrl: user.photoURL ?? null,
                  emailVerified: user.emailVerified ?? false,
                }
              : null,
          );
        },
        onError,
      );
    },
    async signIn() {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    async redirectSignIn() {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, new GoogleAuthProvider());
    },
    async finishRedirect() {
      await getRedirectResult(auth);
    },
    async signOut() {
      await signOut(auth);
    },
    async getToken(expectedUid, forceRefresh = false) {
      const user = activeUser;
      if (
        !user ||
        auth.currentUser?.uid !== user.uid ||
        (expectedUid && user.uid !== expectedUid)
      )
        throw Error('No authenticated user');
      const token = await user.getIdToken(forceRefresh);
      if (auth.currentUser?.uid !== user.uid)
        throw Error('Authenticated user changed');
      return token;
    },
  };
}

export const isFirebaseClientConfigured = hasFirebaseConfig;
