import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flower2, Play } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionHeader,
} from '../../design-system/components';
import { ProgramCard } from '../../design-system/patterns/ProgramCard';
import { ResourceView } from '../../design-system/patterns/ResourceView';
import { useCatalog } from '../../hooks/useCatalog';
import { useI18n } from '../../i18n';
export function HomePage() {
  const resource = useCatalog();
  const { t } = useI18n();
  const [notice, setNotice] = useState(false);
  return (
    <>
      <PageHeader title={t('home.title')} subtitle={t('home.subtitle')} />
      <ResourceView resource={resource}>
        {(data) => {
          const main = data.programs.find(
            (p) => p.id === data.overview.mainProgramId,
          );
          const mainEntry = data.library.find(
            (p) => p.programId === data.overview.mainProgramId,
          );
          if (!main || !mainEntry) return <EmptyState />;
          return (
            <>
              <section className="hero">
                <div>
                  <p className="eyebrow">
                    {t('home.next')} · {t('home.main')}
                  </p>
                  <h2>{main.title}</h2>
                  <p>
                    {t('home.session', {
                      current: data.overview.nextSessionPosition,
                      total: main.sessionCount,
                    })}
                  </p>
                  <ProgressBar
                    value={mainEntry.progress.percent}
                    label={t('program.progress')}
                  />
                  <Button onClick={() => setNotice(true)}>
                    <Play size={18} />
                    {t('home.train')}
                  </Button>
                  {notice && (
                    <p className="notice" role="status">
                      {t('home.playerNotice')}
                    </p>
                  )}
                </div>
                <div className="hero-art" aria-hidden="true">
                  <span className="sun" />
                  <span className="arch" />
                  <Flower2 size={110} />
                </div>
              </section>
              <p className="demo-caption">{t('demo.notice')}</p>
              <SectionHeader title={t('home.week')} />
              <Card className="week">
                <div className="week-days">
                  {(
                    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
                  ).map((day, i) => (
                    <div key={day}>
                      <span>{t(`week.${day}`)}</span>
                      <span
                        className={
                          data.overview.weeklySessionCounts[i] > 0
                            ? 'day-dot practiced'
                            : 'day-dot'
                        }
                        aria-label={
                          data.overview.weeklySessionCounts[i] > 0
                            ? t('week.activity', { day: t(`week.${day}`) })
                            : undefined
                        }
                      >
                        {data.overview.weeklySessionCounts[i] > 0 ? '✓' : '–'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="stats">
                  <p>
                    <strong>
                      {data.overview.weeklySessionCounts.reduce(
                        (sum, value) => sum + value,
                        0,
                      )}
                    </strong>{' '}
                    {t('home.sessions')}
                  </p>
                  <p>
                    <strong>{data.overview.weeklyMinutes}</strong>{' '}
                    {t('home.minutes')}
                  </p>
                </div>
              </Card>
              {(['active', 'paused'] as const).map((status) => (
                <section key={status}>
                  <SectionHeader
                    title={t(
                      status === 'active' ? 'home.active' : 'home.paused',
                    )}
                  />
                  <div className="program-grid">
                    {data.library
                      .filter((x) => x.status === status)
                      .map((entry) => {
                        const p = data.programs.find(
                          (p) => p.id === entry.programId,
                        );
                        return (
                          p && (
                            <ProgramCard
                              key={p.id}
                              program={p}
                              progress={entry.progress}
                            />
                          )
                        );
                      })}
                  </div>
                </section>
              ))}
              <SectionHeader title={t('home.circle')}>
                <Link className="text-link" to="/circles">
                  {t('nav.circles')}
                  <ArrowRight size={16} />
                </Link>
              </SectionHeader>
              <Card>
                <h3>{data.circles[0]?.title}</h3>
                <p>{data.posts[0]?.text}</p>
              </Card>
              <div className="gentle-note">
                <Flower2 size={24} />
                <p>{t('home.gentle')}</p>
              </div>
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
