import { Timestamp } from 'firebase-admin/firestore';
import type {
  AccountDatabase,
  AccountTransaction,
} from '../services/account/database.js';
function copy<T>(value: T): T {
  if (value instanceof Timestamp) return value;
  if (Array.isArray(value)) return value.map(copy) as T;
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, copy(v)]),
    ) as T;
  return value;
}
// Test transaction engine: serializable commits and rollback, preserving immutable
// Firestore Timestamp values. Real emulator coverage is a separate command.
export class MemoryDatabase implements AccountDatabase {
  docs = new Map<string, unknown>();
  private tail: Promise<unknown> = Promise.resolve();
  now() {
    return Timestamp.fromMillis(Date.now());
  }
  run<T>(work: (tx: AccountTransaction) => Promise<T>): Promise<T> {
    const operation = this.tail.then(async () => {
      const draft = new Map([...this.docs].map(([k, v]) => [k, copy(v)]));
      let writing = false;
      const tx: AccountTransaction = {
        async get(path) {
          if (writing) throw Error('All transaction reads must precede writes');
          return copy(draft.get(path));
        },
        set(path, value) {
          writing = true;
          draft.set(path, copy(value));
        },
        create(path, value) {
          writing = true;
          if (draft.has(path)) throw Error('Duplicate document');
          draft.set(path, copy(value));
        },
      };
      const result = await work(tx);
      this.docs = draft;
      return copy(result);
    });
    this.tail = operation.catch(() => {});
    return operation;
  }
  count(collection: string) {
    return [...this.docs.keys()].filter((p) => p.startsWith(collection + '/'))
      .length;
  }
}
