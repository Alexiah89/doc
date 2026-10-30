import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { unconfiguredAuthRepository } from '../../data/firebase/FirebaseAuthRepository';
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
  const [demo] = useState(createDemoRepositories);
  const value = useMemo(
    () =>
      repositories ??
      (mode === 'demo'
        ? demo
        : createAccountRepositories(
            client,
            identity?.uid ?? 'guest',
            session.authRepository ?? unconfiguredAuthRepository,
          )),
    [repositories, mode, demo, client, identity, session.authRepository],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRepositories() {
  const value = useContext(Context);
  if (!value) throw Error('RepositoryProvider missing');
  return value;
}
