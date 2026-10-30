import { createContext, useContext, useState, type ReactNode } from 'react';
import { createDemoRepositories } from '../../data/demo/repositories';
import type { Repositories } from '../../data/repositories/interfaces';
import { appConfig } from '../config';
const Context = createContext<Repositories | null>(null);
export function RepositoryProvider({
  children,
  repositories,
}: {
  children: ReactNode;
  repositories?: Repositories;
}) {
  const [value] = useState(
    () =>
      repositories ?? (appConfig.demoMode ? createDemoRepositories() : null),
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRepositories() {
  const value = useContext(Context);
  if (!value) throw new Error('Demo repositories unavailable');
  return value;
}
