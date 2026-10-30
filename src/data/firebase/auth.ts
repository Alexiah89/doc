import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
export interface AuthIdentity {
  uid: string;
  displayName: string;
}
export interface AuthDriver {
  subscribe(
    onUser: (user: AuthIdentity | null) => void,
    onError: () => void,
  ): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  getToken(expectedUid?: string): Promise<string>;
}
function firebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}
export function hasFirebaseConfig() {
  return Object.values(firebaseConfig()).every(
    (value) => typeof value === 'string' && value.length > 0,
  );
}
export function createFirebaseAuth(): AuthDriver | null {
  if (!hasFirebaseConfig()) return null;
  let auth: ReturnType<typeof getAuth>;
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig());
    auth = getAuth(app);
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
              ? { uid: user.uid, displayName: user.displayName ?? '' }
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
    async signOut() {
      await signOut(auth);
    },
    async getToken(expectedUid) {
      const user = activeUser;
      if (
        !user ||
        auth.currentUser?.uid !== user.uid ||
        (expectedUid && user.uid !== expectedUid)
      )
        throw Error('No authenticated user');
      const token = await user.getIdToken();
      if (auth.currentUser?.uid !== user.uid)
        throw Error('Authenticated user changed');
      return token;
    },
  };
}
