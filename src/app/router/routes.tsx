import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { WelcomePage } from '../../features/auth/WelcomePage';
import { OnboardingPage } from '../../features/onboarding/OnboardingPage';
import { HomePage } from '../../features/home/HomePage';
import { DiscoverPage } from '../../features/discover/DiscoverPage';
import { LibraryPage } from '../../features/library/LibraryPage';
import { CirclesPage } from '../../features/circles/CirclesPage';
import { ProfilePage } from '../../features/profile/ProfilePage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { LoadingState, PageHeader } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { appConfig } from '../config';
import { RequireAccount } from './RequireAccount';
import { useSession } from '../providers/SessionProvider';
import {
  AccountHomePage,
  AccountProfilePage,
  AccountSettingsPage,
  AccountPendingPage,
} from '../../features/account/AccountPages';
const DevPage = import.meta.env.DEV
  ? lazy(() => import('../../features/dev/DevPage'))
  : null;
function NotFound() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        title={t('common.notFound')}
        subtitle={t('common.notFoundDescription')}
      />
      <Link to="/">{t('common.backHome')}</Link>
    </>
  );
}
export function AppRoutes({
  development = appConfig.development,
}: {
  development?: boolean;
}) {
  const { mode } = useSession();
  const demo = mode === 'demo';
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<WelcomePage login />} />
        <Route element={<RequireAccount />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/home"
            element={demo ? <HomePage /> : <AccountHomePage />}
          />
          <Route
            path="/discover"
            element={
              demo ? (
                <DiscoverPage />
              ) : (
                <AccountPendingPage title="nav.discover" />
              )
            }
          />
          <Route
            path="/library"
            element={
              demo ? (
                <LibraryPage />
              ) : (
                <AccountPendingPage title="nav.library" />
              )
            }
          />
          <Route
            path="/circles"
            element={
              demo ? (
                <CirclesPage />
              ) : (
                <AccountPendingPage title="nav.circles" />
              )
            }
          />
          <Route
            path="/profile"
            element={demo ? <ProfilePage /> : <AccountProfilePage />}
          />
          <Route
            path="/settings"
            element={demo ? <SettingsPage /> : <AccountSettingsPage />}
          />
        </Route>
        {development && demo && DevPage && (
          <Route
            path="/dev/demo"
            element={
              <Suspense fallback={<LoadingState />}>
                <DevPage />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
