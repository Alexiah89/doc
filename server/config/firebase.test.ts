// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readFirebaseConfig } from './firebase';
const privateKey = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;
const service = {
  project_id: 'test-project',
  client_email: 'test@example.iam.gserviceaccount.com',
  private_key: privateKey,
};
function config(value: unknown) {
  return {
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(value),
  };
}
describe('Firebase server configuration', () => {
  it('identifies a missing or invalid server project ID', () => {
    expect(() => readFirebaseConfig({})).toThrow('firebase-project-id-missing');
    expect(() =>
      readFirebaseConfig({ FIREBASE_PROJECT_ID: '"test-project"' }),
    ).toThrow('firebase-project-id-invalid');
  });
  it('accepts a valid service account without trying ADC first', () => {
    const result = readFirebaseConfig(config(service));
    expect(result.projectId).toBe('test-project');
    expect(result.serviceAccount?.clientEmail).toBe(service.client_email);
  });
  it('distinguishes invalid JSON, missing fields, project mismatch and invalid PEM', () => {
    expect(() =>
      readFirebaseConfig({
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_SERVICE_ACCOUNT_JSON: '{bad',
      }),
    ).toThrow('firebase-service-account-json-invalid');
    expect(() =>
      readFirebaseConfig(config({ apiKey: 'public-web-key' })),
    ).toThrow('firebase-service-account-fields-missing');
    expect(() =>
      readFirebaseConfig(config({ ...service, project_id: 'other-project' })),
    ).toThrow('firebase-project-mismatch');
    expect(() =>
      readFirebaseConfig(config({ ...service, private_key: 'not-a-key' })),
    ).toThrow('firebase-private-key-invalid');
  });
  it('allows trusted ADC and trims project ID whitespace', () => {
    expect(
      readFirebaseConfig({ FIREBASE_PROJECT_ID: ' test-project ' }),
    ).toEqual({ projectId: 'test-project' });
  });
  it('handles literal escaped newlines without skipping key validation', () => {
    const result = readFirebaseConfig(
      config({ ...service, private_key: privateKey.replace(/\n/g, '\\n') }),
    );
    expect(result.serviceAccount?.privateKey).toBe(privateKey);
  });
  it('never includes credential content in a configuration error', () => {
    const bad = 'sensitive-test-marker';
    try {
      readFirebaseConfig(config({ ...service, private_key: bad }));
      throw Error('Expected rejection');
    } catch (error) {
      expect(String(error)).not.toContain(bad);
      expect(error).toMatchObject({
        status: 503,
        code: 'firebase-private-key-invalid',
      });
    }
  });
});
