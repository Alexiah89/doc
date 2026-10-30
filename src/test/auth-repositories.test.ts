import { describe, it, expect, vi } from 'vitest';
import { FirebaseAuthRepository } from '../data/firebase/FirebaseAuthRepository';
import { DemoAuthRepository } from '../data/demo/repositories';
import type { AuthDriver, AuthIdentity } from '../data/firebase/auth';
describe('AuthRepository contract', () => {
  it('maps Firebase identities to an independent AuthUser and supports token refresh', async () => {
    let callback: (value: AuthIdentity | null) => void = () => {};
    const getToken = vi.fn(async () => 'test-token');
    const driver: AuthDriver = {
      subscribe(cb) {
        callback = cb;
        return () => {};
      },
      async signIn() {
        callback({
          uid: 'user-a',
          displayName: 'Alex',
          photoUrl: null,
          emailVerified: true,
        });
      },
      async signOut() {
        callback(null);
      },
      getToken,
    };
    const repository = new FirebaseAuthRepository(driver);
    repository.subscribeToAuthState(() => {});
    expect(await repository.getCurrentUser()).toBeNull();
    const current = await repository.signInWithGoogle();
    expect(current).toEqual({
      uid: 'user-a',
      displayName: 'Alex',
      photoUrl: null,
      emailVerified: true,
    });
    current.uid = 'modified';
    expect((await repository.getCurrentUser())?.uid).toBe('user-a');
    expect(await repository.getIdToken(true)).toBe('test-token');
    expect(getToken).toHaveBeenCalledWith('user-a', true);
    await repository.signOut();
    expect(await repository.getIdToken()).toBeNull();
  });
  it('never produces a real token or Google login success in DemoAuthRepository', async () => {
    const repository = new DemoAuthRepository();
    await repository.startDemo();
    expect(await repository.getCurrentUser()).toBeNull();
    expect(await repository.getIdToken()).toBeNull();
    await expect(repository.signInWithGoogle()).rejects.toThrow();
  });
});
