// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { requireFirebaseAuth, optionalFirebaseAuth } from './auth';
import {
  AccountError,
  type AccountServices,
} from '../services/account/contracts';
const service = {
  verifyToken: vi.fn(async (token: string) => {
    if (token !== 'test-token')
      throw new AccountError(
        401,
        'invalid-auth-token',
        'errors.invalid-auth-token',
      );
    return { uid: 'user-a', emailVerified: true };
  }),
} as unknown as AccountServices;
describe('Server authentication middleware', () => {
  it('allows absent optional auth but rejects absent required auth', async () => {
    expect(await optionalFirebaseAuth(undefined, service)).toEqual({
      userId: null,
    });
    await expect(requireFirebaseAuth(undefined, service)).rejects.toMatchObject(
      { status: 401, code: 'unauthenticated' },
    );
  });
  it('extracts only a verified identity and rejects malformed or invalid supplied tokens', async () => {
    expect(
      await requireFirebaseAuth('Bearer test-token', service),
    ).toMatchObject({ userId: 'user-a', emailVerified: true });
    for (const header of [
      '',
      'Bearer ',
      'Basic test-token',
      'Bearer two tokens',
      'Bearer forged',
    ])
      await expect(optionalFirebaseAuth(header, service)).rejects.toMatchObject(
        { status: 401 },
      );
  });
});
