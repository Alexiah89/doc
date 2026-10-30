import type { AuthRepository } from '../repositories/interfaces';
import type { AuthUser } from '../models';
import type { AuthDriver, AuthIdentity } from './auth';
const mapped = (identity: AuthIdentity): AuthUser => ({
  uid: identity.uid,
  displayName: identity.displayName || null,
  photoUrl: identity.photoUrl ?? null,
  emailVerified: identity.emailVerified ?? false,
});
export class FirebaseAuthRepository implements AuthRepository {
  private current: AuthUser | null = null;
  constructor(private driver: AuthDriver) {}
  async getCurrentUser() {
    return this.current ? structuredClone(this.current) : null;
  }
  async signInWithGoogle() {
    await this.driver.signIn();
    if (this.current) return structuredClone(this.current);
    return new Promise<AuthUser>((resolve, reject) => {
      let stop = () => {};
      const timeout = setTimeout(() => {
        stop();
        reject(Error('Auth restore timed out'));
      }, 15000);
      stop = this.subscribeToAuthState(
        (user) => {
          if (user) {
            clearTimeout(timeout);
            stop();
            resolve(user);
          }
        },
        () => {
          clearTimeout(timeout);
          stop();
          reject(Error('Auth restore failed'));
        },
      );
    });
  }
  signOut() {
    this.current = null;
    return this.driver.signOut();
  }
  async getIdToken(forceRefresh = false) {
    return this.current
      ? this.driver.getToken(this.current.uid, forceRefresh)
      : null;
  }
  subscribeToAuthState(
    callback: (user: AuthUser | null) => void,
    onError?: () => void,
  ) {
    return this.driver.subscribe(
      (identity) => {
        this.current = identity ? mapped(identity) : null;
        callback(this.current ? structuredClone(this.current) : null);
      },
      () => {
        this.current = null;
        if (onError) onError();
        else callback(null);
      },
    );
  }
  async startDemo(): Promise<import('../models').User> {
    throw Error('Use the separate demo entry');
  }
}

export const unconfiguredAuthRepository: AuthRepository = {
  async getCurrentUser() {
    return null;
  },
  async signInWithGoogle() {
    throw Error('Firebase client not configured');
  },
  async signOut() {},
  async getIdToken() {
    return null;
  },
  subscribeToAuthState(callback) {
    queueMicrotask(() => callback(null));
    return () => {};
  },
  async startDemo() {
    throw Error('Use the explicit demo entry');
  },
};
