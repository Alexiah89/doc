import { createPrivateKey } from 'node:crypto';
import type { ServiceAccount } from 'firebase-admin/app';
import { AccountError } from '../services/account/contracts.js';
function configurationError(code: string): never {
  throw new AccountError(503, code, 'account.unavailable', true);
}
export function readFirebaseConfig(env: NodeJS.ProcessEnv = process.env): {
  projectId: string;
  serviceAccount?: ServiceAccount;
  preferAdc?: boolean;
} {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) configurationError('firebase-project-id-missing');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId))
    configurationError('firebase-project-id-invalid');
  if (
    env.GOOGLE_APPLICATION_CREDENTIALS ||
    env.K_SERVICE ||
    env.FIREBASE_CREDENTIAL_MODE === 'adc'
  )
    return { projectId, preferAdc: true };
  const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim() && (env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_PRIVATE_KEY)) {
    if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY)
      configurationError('firebase-service-account-fields-missing');
    return readFirebaseConfig({
      ...env,
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: projectId,
        client_email: env.FIREBASE_CLIENT_EMAIL,
        private_key: env.FIREBASE_PRIVATE_KEY,
      }),
      FIREBASE_CLIENT_EMAIL: undefined,
      FIREBASE_PRIVATE_KEY: undefined,
    });
  }
  if (!raw?.trim()) return { projectId };
  let value: unknown;
  try {
    value = JSON.parse(raw.trim().replace(/^\uFEFF/, ''));
  } catch {
    configurationError('firebase-service-account-json-invalid');
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    !('project_id' in value) ||
    typeof value.project_id !== 'string' ||
    !('client_email' in value) ||
    typeof value.client_email !== 'string' ||
    !value.client_email.trim() ||
    !('private_key' in value) ||
    typeof value.private_key !== 'string' ||
    !value.private_key.trim()
  )
    configurationError('firebase-service-account-fields-missing');
  if (value.project_id !== projectId)
    configurationError('firebase-project-mismatch');
  const privateKey = value.private_key.replace(/\\n/g, '\n');
  try {
    if (createPrivateKey(privateKey).asymmetricKeyType !== 'rsa')
      configurationError('firebase-private-key-invalid');
  } catch {
    configurationError('firebase-private-key-invalid');
  }
  return {
    projectId,
    serviceAccount: { projectId, clientEmail: value.client_email, privateKey },
  };
}
