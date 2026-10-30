import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Flower2 } from 'lucide-react';
import { useI18n, type TranslationKey } from '../../i18n';
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../../design-system/components';
import { useRepositories } from '../../app/providers/RepositoryProvider';
import { useSession } from '../../app/providers/SessionProvider';
import { AccountAccessError } from '../account/AccountAccessError';
export function WelcomePage({ login = false }: { login?: boolean }) {
  const { t } = useI18n();
  const session = useSession();
  const { auth, settings } = useRepositories();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<TranslationKey | null>(null);
  const [loading, setLoading] = useState(false);
  async function startDemo() {
    session.enterDemo();
    if (session.mode === 'demo') {
      try {
        await auth.startDemo();
        navigate(settings.getOnboarding().completed ? '/home' : '/onboarding');
      } catch {
        setError('common.errorDescription');
      }
    } else navigate('/onboarding');
  }
  async function signIn() {
    setError(null);
    if (!session.configured) {
      setError('auth.configMissing');
      return;
    }
    setLoading(true);
    try {
      await session.signIn();
    } catch (cause) {
      const code =
        typeof cause === 'object' && cause && 'code' in cause
          ? String(cause.code)
          : '';
      setError(
        code === 'auth/popup-blocked'
          ? 'auth.popupBlocked'
          : code === 'auth/popup-closed-by-user' ||
              code === 'auth/cancelled-popup-request'
            ? 'auth.cancelled'
            : 'auth.failed',
      );
    } finally {
      setLoading(false);
    }
  }
  if (
    session.mode === 'live' &&
    session.status === 'ready' &&
    session.account
  ) {
    const from: unknown = location.state?.from;
    const allowed = [
      '/home',
      '/profile',
      '/settings',
      '/library',
      '/circles',
      '/discover',
    ];
    return (
      <Navigate
        replace
        to={
          session.account.onboarding.completed
            ? typeof from === 'string' && allowed.includes(from)
              ? from
              : '/home'
            : '/onboarding'
        }
      />
    );
  }
  return (
    <section className="welcome">
      <Flower2 size={56} aria-hidden="true" />
      <p className="wordmark">{t('brand')}</p>
      <PageHeader
        title={t(login ? 'auth.title' : 'claim')}
        subtitle={t('welcome.description')}
      />
      <div className="benefits">
        {(
          ['welcome.organize', 'welcome.progress', 'welcome.circles'] as const
        ).map((key, i) => (
          <Card key={key}>
            <span className="benefit-number" aria-hidden="true">
              {i + 1}
            </span>
            <h2>{t(key)}</h2>
          </Card>
        ))}
      </div>
      <div className="actions">
        <Button
          loading={
            loading ||
            (session.mode === 'live' &&
              (session.status === 'initializing' ||
                session.status === 'loadingAccount'))
          }
          onClick={() => void signIn()}
        >
          {t('auth.google')}
        </Button>
        <Button variant="secondary" onClick={() => void startDemo()}>
          {t('auth.demo')}
        </Button>
      </div>
      {error && <ErrorState inline description={t(error)} />}{' '}
      {session.mode === 'live' && session.status === 'error' && (
        <AccountAccessError />
      )}{' '}
      {session.mode === 'live' && session.status === 'loadingAccount' && (
        <LoadingState />
      )}
      <p className="muted">{t('auth.separateDemo')}</p>
      <Link to="/home">{t('nav.home')}</Link>
    </section>
  );
}
