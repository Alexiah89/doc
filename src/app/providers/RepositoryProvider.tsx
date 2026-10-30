import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createDemoRepositories } from '../../data/demo/repositories';
import { createAccountRepositories } from '../../data/repositories/account';
import type { Repositories } from '../../data/repositories/interfaces';
import { useSession } from './SessionProvider';
const Context = createContext<Repositories | null>(null);
export function RepositoryProvider({
  children,
  repositories,
}: {
  children: ReactNode;
  repositories?: Repositories;
}) {
  const session = useSession();
  const { mode, client, identity } = session;
  const value = useMemo(
    () =>
      repositories ??
      (mode === 'demo'
        ? createDemoRepositories()
        : createAccountRepositories(client, identity?.uid ?? 'guest', {
            async getCurrentUser() {
              if (!identity) return null;
              return {
                id: identity.uid,
                displayName: identity.displayName,
                username: `user_${identity.uid}`,
              };
            },
            async startDemo() {
              throw Error('Use the explicit demo entry');
            },
          })),
    [repositories, mode, client, identity],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRepositories() {
  const value = useContext(Context);
  if (!value) throw Error('RepositoryProvider missing');
  return value;
}
