import { isFirebaseAdminConfigured } from './firebaseAdmin.js';
import { getServerConfig } from '../config/index.js';
export function health() {
  const config = getServerConfig();
  return {
    status: 'ok',
    environment: config.environment,
    version: config.version,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' &&
    config.environment === 'development'
      ? {
          diagnostics: {
            firebaseAdminConfigured: isFirebaseAdminConfigured(),
            authEmulator:
              process.env.FIREBASE_USE_EMULATORS === 'true' &&
              Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST),
            firestoreEmulator:
              process.env.FIREBASE_USE_EMULATORS === 'true' &&
              Boolean(process.env.FIRESTORE_EMULATOR_HOST),
          },
        }
      : {}),
  };
}
