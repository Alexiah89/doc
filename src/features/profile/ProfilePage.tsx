import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import {
  Avatar,
  Card,
  Chip,
  PageHeader,
  ProgressBar,
  SectionHeader,
} from '../../design-system/components';
import { ProgramCard } from '../../design-system/patterns/ProgramCard';
import { ResourceView } from '../../design-system/patterns/ResourceView';
import { useCatalog } from '../../hooks/useCatalog';
export function ProfilePage() {
  const { t } = useI18n();
  const resource = useCatalog();
  const [tab, setTab] = useState<
    'overview' | 'programs' | 'activities' | 'reviews'
  >('overview');
  return (
    <>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')}>
        <Link to="/settings">{t('nav.settings')}</Link>
      </PageHeader>
      <ResourceView resource={resource}>
        {(data) => (
          <>
            <Card className="profile-intro">
              <Avatar name={data.profile.displayName} />
              <div>
                <h2>{data.profile.displayName}</h2>
                <p>@{data.profile.username}</p>
                <p>{data.profile.bio}</p>
                <span className="badge">{t('profile.privacy')}</span>
                <p>
                  {data.profile.followers} {t('profile.followers')} ·{' '}
                  {data.profile.following} {t('profile.following')}
                </p>
              </div>
            </Card>
            <div className="chips" role="group" aria-label={t('profile.title')}>
              {(['overview', 'programs', 'activities', 'reviews'] as const).map(
                (value) => (
                  <Chip
                    selected={tab === value}
                    key={value}
                    onClick={() => setTab(value)}
                  >
                    {t(`profile.${value}`)}
                  </Chip>
                ),
              )}
            </div>
            {tab === 'overview' && (
              <>
                <div className="two-column">
                  <Card>
                    <h2>{t('profile.interests')}</h2>
                    <div className="chips">
                      {data.profile.interests.map((x) => (
                        <span className="badge" key={x}>
                          {t(`activity.${x}`)}
                        </span>
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <h2>{t('profile.goal')}</h2>
                    <ProgressBar
                      value={
                        data.profile.annualGoal > 0
                          ? Math.round(
                              (data.profile.sessionsThisYear /
                                data.profile.annualGoal) *
                                100,
                            )
                          : 0
                      }
                      label={t('profile.goalValue', {
                        done: data.profile.sessionsThisYear,
                        total: data.profile.annualGoal,
                      })}
                    />
                  </Card>
                </div>
                <SectionHeader title={t('profile.stats')} />
                <Card className="stats">
                  <p>
                    <strong>{data.profile.sessionsThisYear}</strong>{' '}
                    {t('home.sessions')}
                  </p>
                  <p>
                    <strong>{data.profile.minutesThisYear}</strong>{' '}
                    {t('home.minutes')}
                  </p>
                </Card>
                <SectionHeader title={t('nav.circles')} />
                <Card>
                  {data.circles.map((c) => (
                    <p key={c.id}>{c.title}</p>
                  ))}
                </Card>
              </>
            )}
            {tab === 'programs' && (
              <>
                {(['active', 'completed'] as const).map((status) => (
                  <section key={status}>
                    <SectionHeader
                      title={t(
                        status === 'active'
                          ? 'home.active'
                          : 'profile.completed',
                      )}
                    />
                    <div className="program-grid">
                      {data.library
                        .filter((e) => e.status === status)
                        .map((e) => {
                          const program = data.programs.find(
                            (p) => p.id === e.programId,
                          );
                          return (
                            program && (
                              <ProgramCard
                                key={program.id}
                                program={program}
                                progress={e.progress}
                              />
                            )
                          );
                        })}
                    </div>
                  </section>
                ))}
              </>
            )}
            {tab === 'activities' && (
              <Card>
                {data.posts
                  .filter((p) => p.userId === data.profile.id)
                  .slice(0, 2)
                  .map((post) => (
                    <div className="circle-activity" key={post.id}>
                      <h3>
                        {
                          data.circles.find((c) => c.id === post.circleId)
                            ?.title
                        }
                      </h3>
                      <p>{post.text}</p>
                      <p className="demo-caption">{t('demo.notice')}</p>
                    </div>
                  ))}
              </Card>
            )}
            {tab === 'reviews' &&
              data.reviews
                .filter((r) => r.userId === data.profile.id)
                .map((review) => (
                  <Card key={review.id}>
                    <h2>
                      {
                        data.programs.find((p) => p.id === review.programId)
                          ?.title
                      }
                    </h2>
                    <p
                      aria-label={t('program.rating', {
                        rating: review.stars,
                        count: 1,
                      })}
                    >
                      {'★'.repeat(review.stars)}
                    </p>
                    <p>{review.text}</p>
                    <p className="demo-caption">
                      {t('profile.reviewProgress', {
                        count: review.completedAtReview,
                      })}
                    </p>
                  </Card>
                ))}
          </>
        )}
      </ResourceView>
    </>
  );
}
