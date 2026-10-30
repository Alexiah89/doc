import type { Repositories } from '../data/repositories/interfaces';
import { RepositoryProvider } from './providers/RepositoryProvider';
import { I18nProvider } from '../i18n';
import { AppRoutes } from './router/routes';
import { appConfig } from './config';
import { de } from '../i18n/de-DE';
export function App({
  repositories,
  development,
}: {
  repositories?: Repositories;
  development?: boolean;
}) {
  if (!appConfig.demoMode)
    return (
      <main>
        <p role="alert">{de['errors.demoDisabled']}</p>
      </main>
    );
  return (
    <RepositoryProvider repositories={repositories}>
      <I18nProvider>
        <AppRoutes development={development} />
      </I18nProvider>
    </RepositoryProvider>
  );
}
