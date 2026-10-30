import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../providers/SessionProvider';
import { AccountStatusPage } from '../../features/account/AccountStatusPage';
import { AccountAccessError } from '../../features/account/AccountAccessError';
import { useI18n } from '../../i18n';
import {
  Button,
  ErrorState,
  LoadingState,
} from '../../design-system/components';
export function RequireAccount() {
  const session = useSession();
  const { t } = useI18n();
  const location = useLocation();
  const [logoutFailed, setLogoutFailed] = useState(false);
  async function logout() {
    try {
      await session.signOut();
    } catch {
      setLogoutFailed(true);
    }
  }
  if (session.mode === 'demo') return <Outlet />;
  if (session.status === 'initializing' || session.status === 'loadingAccount')
    return (
      <LoadingState
        label={t(
          session.status === 'initializing'
            ? 'state.restore'
            : 'state.accountLoading',
        )}
      />
    );
  if (session.status === 'signedOut')
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (session.authState === 'account-suspended') return <AccountStatusPage />;
  if (
    session.account?.onboarding.completed &&
    location.pathname === '/onboarding'
  )
    return <Navigate to="/home" replace />;
  if (session.status === 'error')
    return (
      <>
        <AccountAccessError />
        {logoutFailed && (
          <ErrorState inline description={t('auth.signOutFailed')} />
        )}
        <Button variant="ghost" onClick={() => void logout()}>
          {t('auth.signOut')}
        </Button>
      </>
    );
  if (
    !session.account?.onboarding.completed &&
    location.pathname !== '/onboarding'
  )
    return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
