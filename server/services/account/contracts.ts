import type { Account } from '../../../shared/account.js';
export interface Identity {
  uid: string;
  name?: string;
  photoUrl?: string;
  emailVerified?: boolean;
}
export interface AccountStore {
  getOrCreate(identity: Identity): Promise<Account>;
  update(
    identity: Identity,
    expectedRevision: number,
    change: (account: Account) => Account,
  ): Promise<Account>;
}
export interface AccountServices {
  users?: import('./users.js').UserAccountService;
  verifyToken(token: string): Promise<Identity>;
  store: AccountStore;
}
export class AccountError extends Error {
  constructor(
    public status: number,
    public code: string,
    public userMessageKey: string,
    public retryable = false,
  ) {
    super(code);
  }
}
