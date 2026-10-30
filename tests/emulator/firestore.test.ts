import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../../server/services/firebaseAdmin';
import { UserAccountService } from '../../server/services/account/users';
import { firestoreDatabase } from '../../server/services/account/database';
import { defaultPreferences } from '../../shared/users';
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-flowcircle',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});
afterAll(async () => {
  await env.cleanup();
});
describe('Official Firestore emulator security and transaction integration', () => {
  it('denies direct authenticated and anonymous reads/writes of every private collection', async () => {
    for (const db of [
      env.authenticatedContext('user-a').firestore(),
      env.unauthenticatedContext().firestore(),
    ])
      for (const collection of [
        'users',
        'profiles',
        'usernames',
        'auditLogs',
        'accounts',
      ]) {
        await assertFails(getDoc(doc(db, collection, 'user-a')));
        await assertFails(
          setDoc(doc(db, collection, 'user-a'), { userId: 'user-a' }),
        );
      }
  });
  it('bootstraps concurrently and completes once using real Firestore transactions', async () => {
    const db = getFirestore(getFirebaseAdmin());
    const users = new UserAccountService(firestoreDatabase(() => db));
    const identity = {
      uid: 'transaction-integration-user',
      name: 'Parallel User',
    };
    await Promise.all(
      Array.from({ length: 6 }, () => users.bootstrap(identity)),
    );
    const current = await users.read(identity);
    expect(current.profile.username).not.toContain(identity.uid);
    const input = {
      preferences: {
        ...defaultPreferences(),
        activityTypes: ['yoga' as const],
      },
      profileVisibility: 'private' as const,
    };
    const first = await users.complete(identity, input);
    expect(await users.complete(identity, input)).toEqual(first);
    expect(first.account.onboardingStatus).toBe('completed');
    const events = await db
      .collection('auditLogs')
      .where('actorUserId', '==', identity.uid)
      .get();
    expect(
      events.docs.filter((d) => d.data().eventType === 'onboarding_completed'),
    ).toHaveLength(1);
  });
});
