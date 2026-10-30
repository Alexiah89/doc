import { describe, expect, it } from 'vitest';
import { firebaseAccountServices } from '../../server/services/account/firebase';
import {
  requireFirebaseAuth,
  optionalFirebaseAuth,
} from '../../server/middleware/auth';
describe('Official Auth Emulator integration', () => {
  it('verifies a Google-provider emulator token and rejects a forged token', async () => {
    expect(process.env.FIREBASE_PROJECT_ID).toBe('demo-flowcircle');
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestUri: 'http://localhost',
          postBody:
            'providerId=google.com&id_token=' +
            encodeURIComponent(
              JSON.stringify({
                sub: 'emulator-auth-user',
                email: 'emulator@example.test',
                email_verified: true,
                name: 'Emulator User',
              }),
            ),
          returnSecureToken: true,
        }),
      },
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(typeof payload.idToken).toBe('string');
    const context = await requireFirebaseAuth(
      `Bearer ${payload.idToken}`,
      firebaseAccountServices,
    );
    expect(context.userId).toBeTruthy();
    expect(
      await optionalFirebaseAuth(undefined, firebaseAccountServices),
    ).toEqual({ userId: null });
    await expect(
      requireFirebaseAuth('Bearer forged', firebaseAccountServices),
    ).rejects.toMatchObject({ status: 401 });
  });
});
