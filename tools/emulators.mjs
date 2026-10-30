import { spawn } from 'node:child_process';
const env = {
  ...process.env,
  FIREBASE_PROJECT_ID: 'demo-flowcircle',
  FIREBASE_USE_EMULATORS: 'true',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  APP_ENV: 'development',
  NODE_ENV: 'development',
};
for (const name of [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
])
  delete env[name];
const only = process.argv.includes('--auth-only') ? 'auth' : 'auth,firestore';
const command = process.argv.includes('--test') ? 'exec' : 'start';
const args = [
  './node_modules/firebase-tools/lib/bin/firebase.js',
  `emulators:${command}`,
  '--project',
  'demo-flowcircle',
  '--only',
  only,
];
if (command === 'exec')
  args.push(
    only === 'auth'
      ? 'npx vitest run --config vitest.emulator.config.ts tests/emulator/auth.test.ts'
      : 'npx vitest run --config vitest.emulator.config.ts',
  );
const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
