import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { readFirebaseConfig } from '../config/firebase.js';
import { AccountError } from './account/contracts.js';
export function emulatorState() {
  const enabled = process.env.FIREBASE_USE_EMULATORS === 'true';
  const auth = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestore = process.env.FIRESTORE_EMULATOR_HOST;
  if (
    (enabled || auth || firestore) &&
    (process.env.NODE_ENV === 'production' ||
      process.env.APP_ENV === 'production' ||
      !process.env.FIREBASE_PROJECT_ID?.startsWith('demo-') ||
      !enabled ||
      !auth ||
      !firestore ||
      ![auth, firestore].every((h) => /^(127\.0\.0\.1|localhost):\d+$/.test(h)))
  )
    throw new AccountError(
      503,
      'unsafe-emulator-config',
      'errors.firebase-not-configured',
    );
  return { auth: enabled, firestore: enabled };
}
export function isFirebaseAdminConfigured() {
  try {
    emulatorState();
    readFirebaseConfig();
    return true;
  } catch {
    return false;
  }
}
export function getFirebaseAdmin() {
  const emulators = emulatorState();
  const { projectId, serviceAccount, preferAdc } = readFirebaseConfig();
  const existing = getApps().find((app) => app.name === 'flowcircle-server');
  if (existing) return existing;
  try {
    return initializeApp(
      {
        projectId,
        ...(emulators.auth
          ? {}
          : {
              credential: preferAdc
                ? applicationDefault()
                : serviceAccount
                  ? cert(serviceAccount)
                  : applicationDefault(),
            }),
      },
      'flowcircle-server',
    );
  } catch {
    throw new AccountError(
      503,
      'firebase-admin-init-failed',
      'errors.firebase-not-configured',
      true,
    );
  }
}
