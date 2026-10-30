import {
  getFirestore,
  Timestamp,
  type Firestore,
} from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../firebaseAdmin.js';
export interface AccountTransaction {
  get(path: string): Promise<unknown | undefined>;
  set(path: string, data: object): void;
  create(path: string, data: object): void;
}
export interface AccountDatabase {
  now(): Timestamp;
  run<T>(work: (tx: AccountTransaction) => Promise<T>): Promise<T>;
}
export function firestoreDatabase(
  db: () => Firestore = () => getFirestore(getFirebaseAdmin()),
): AccountDatabase {
  return {
    now: () => Timestamp.now(),
    run: (work) =>
      db().runTransaction((tx) =>
        work({
          async get(path) {
            const snapshot = await tx.get(db().doc(path));
            return snapshot.exists ? snapshot.data() : undefined;
          },
          set(path, data) {
            tx.set(db().doc(path), data);
          },
          create(path, data) {
            tx.create(db().doc(path), data);
          },
        }),
      ),
  };
}
