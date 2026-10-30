import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flower2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  Button,
  Card,
  ErrorState,
  PageHeader,
} from '../../design-system/components';
import { useRepositories } from '../../app/providers/RepositoryProvider';
export function WelcomePage({ login = false }: { login?: boolean }) {
  const { t } = useI18n();
  const [notice, setNotice] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { auth, settings } = useRepositories();
  const navigate = useNavigate();
  async function start() {
    setLoading(true);
    setFailed(false);
    try {
      await auth.startDemo();
      navigate(settings.getOnboarding().completed ? '/home' : '/onboarding');
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
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
        <Button onClick={() => setNotice(true)}>{t('auth.google')}</Button>
        <Button
          variant="secondary"
          loading={loading}
          onClick={() => void start()}
        >
          {t('auth.demo')}
        </Button>
      </div>
      {notice && (
        <p role="status" className="notice">
          {t('auth.notice')}
        </p>
      )}
      {failed && <ErrorState onRetry={() => void start()} />}
      <p className="muted">{t('demo.notice')}</p>
      <Link to="/home">{t('nav.home')}</Link>
    </section>
  );
}
