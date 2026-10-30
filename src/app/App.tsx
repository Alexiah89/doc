import type { Repositories } from '../data/repositories/interfaces';
import type { AuthDriver } from '../data/firebase/auth';
import { RepositoryProvider } from './providers/RepositoryProvider';
import { SessionProvider, useSession } from './providers/SessionProvider';
import { I18nProvider } from '../i18n';
import { AppRoutes } from './router/routes';
function Application({
  repositories,
  development,
}: {
  repositories?: Repositories;
  development?: boolean;
}) {
  const session = useSession();
  return (
    <RepositoryProvider repositories={repositories}>
      <I18nProvider key={`${session.mode}-${session.identity?.uid ?? 'guest'}`}>
        <AppRoutes development={development} />
      </I18nProvider>
    </RepositoryProvider>
  );
}
export function App({
  repositories,
  development,
  authDriver,
}: {
  repositories?: Repositories;
  development?: boolean;
  authDriver?: AuthDriver | null;
}) {
  return (
    <SessionProvider driver={authDriver}>
      <Application repositories={repositories} development={development} />
    </SessionProvider>
  );
}
