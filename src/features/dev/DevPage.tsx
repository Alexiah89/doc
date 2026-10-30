import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flower2 } from 'lucide-react';
import { useSession } from '../../app/providers/SessionProvider';
import {
  isFirebaseClientConfigured,
  clientEmulatorsEnabled,
} from '../../data/firebase/auth';
import { appConfig } from '../../app/config';
import { useI18n, type TranslationKey } from '../../i18n';
import { useCatalog } from '../../hooks/useCatalog';
import { useResource } from '../../hooks/useResource';
import { getHealth } from '../../data/api/client';
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  PageHeader,
  ProgressBar,
  SectionHeader,
  Skeleton,
} from '../../design-system/components';
import {
  ProgramCard,
  SessionCard,
} from '../../design-system/patterns/ProgramCard';
import { ResourceView } from '../../design-system/patterns/ResourceView';
export default function DevPage() {
  const { t, locale } = useI18n();
  const session = useSession();
  const catalog = useCatalog();
  const health = useResource(useCallback(() => getHealth(), []));
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const rows: [TranslationKey, string][] = [
    [
      'dev.firebaseClient',
      t(isFirebaseClientConfigured() ? 'dev.yes' : 'dev.no'),
    ],
    [
      'dev.firebaseAdmin',
      health.data?.diagnostics
        ? t(
            health.data.diagnostics.firebaseAdminConfigured
              ? 'dev.yes'
              : 'dev.no',
          )
        : t('dev.unknown'),
    ],
    ['dev.authMode', session.mode === 'demo' ? 'Demo' : 'Firebase'],
    ['dev.authState', session.authState],
    [
      'dev.uid',
      session.identity
        ? `••••${session.identity.uid.slice(-4)}`
        : t('dev.noUser'),
    ],
    ['dev.accountStatus', session.account?.accountStatus ?? t('dev.unknown')],
    [
      'dev.onboardingStatus',
      session.account?.onboardingStatus ?? t('dev.unknown'),
    ],
    [
      'dev.onboardingStep',
      session.account
        ? String(session.account.onboarding.step + 1)
        : t('dev.unknown'),
    ],
    ['dev.authEmulator', t(clientEmulatorsEnabled() ? 'dev.yes' : 'dev.no')],
    [
      'dev.firestoreEmulator',
      health.data?.diagnostics
        ? t(health.data.diagnostics.firestoreEmulator ? 'dev.yes' : 'dev.no')
        : t('dev.unknown'),
    ],

    ['dev.environment', appConfig.environment],
    ['dev.version', appConfig.version],
    ['dev.mode', t(appConfig.demoMode ? 'dev.enabled' : 'dev.off')],
    ['dev.language', locale],
    [
      'dev.breakpoint',
      t(
        width < 600 ? 'dev.phone' : width < 1200 ? 'dev.tablet' : 'dev.desktop',
      ),
    ],
    [
      'dev.health',
      t(
        health.loading
          ? 'common.loading'
          : health.error
            ? 'dev.healthError'
            : 'dev.healthOk',
      ),
    ],
  ];
  return (
    <>
      <PageHeader title={t('dev.title')} />
      <Card>
        <dl>
          {rows.map(([key, value]) => (
            <div className="diagnostic-row" key={key}>
              <dt>{t(key)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {health.error && (
          <Button variant="secondary" onClick={health.retry}>
            {t('common.retry')}
          </Button>
        )}
      </Card>
      <ResourceView resource={catalog}>
        {(data) => (
          <>
            <Card className="stats">
              <p>
                {t('dev.programs')}: {data.programs.length}
              </p>
              <p>
                {t('dev.users')}: {data.users.length}
              </p>
              <p>
                {t('dev.circles')}: {data.circles.length}
              </p>
            </Card>
            <SectionHeader title={t('dev.routes')} />
            <div className="route-links">
              {[
                '/',
                '/login',
                '/onboarding',
                '/home',
                '/discover',
                '/library',
                '/circles',
                '/profile',
                '/settings',
                '/dev/demo',
              ].map((path) => (
                <Link key={path} to={path}>
                  {path}
                </Link>
              ))}
            </div>
            <SectionHeader title={t('dev.components')} />
            <Card>
              <div className="actions">
                <Button>{t('dev.default')}</Button>
                <Button className="hover-preview">{t('dev.hover')}</Button>
                <Button variant="secondary">{t('dev.default')}</Button>
                <Button variant="ghost">{t('dev.default')}</Button>
                <Button variant="destructive">{t('dev.destructive')}</Button>
                <Button disabled>{t('dev.disabled')}</Button>
                <Button loading>{t('dev.loading')}</Button>
                <IconButton label={t('dev.demoText')}>
                  <Flower2 />
                </IconButton>
                <Chip selected>{t('dev.demoText')}</Chip>
                <Avatar name={data.profile.displayName} />
              </div>
              <ProgressBar value={27} label={t('program.progress')} />
            </Card>
            <div className="two-column">
              {data.programs[0] && (
                <ProgramCard
                  program={data.programs[0]}
                  progress={data.library[0]?.progress}
                />
              )}
              {data.sessions[0] && <SessionCard session={data.sessions[0]} />}
              <ErrorState
                inline
                title={t('dev.errorInline')}
                onRetry={catalog.retry}
              />
              <ErrorState title={t('dev.errorPage')} onRetry={catalog.retry} />
              <EmptyState />
              <LoadingState />
              <Skeleton />
              <ErrorState
                title={t('common.offlineTitle')}
                description={t('common.offline')}
                onRetry={health.retry}
              />
              <Card>
                <h2>{t('common.notImplemented')}</h2>
                <p>{t('errors.notImplemented')}</p>
              </Card>
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
