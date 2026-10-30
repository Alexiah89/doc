import { useI18n } from '../../i18n';
import {
  Avatar,
  Card,
  PageHeader,
  SectionHeader,
} from '../../design-system/components';
import { ResourceView } from '../../design-system/patterns/ResourceView';
import { useCatalog } from '../../hooks/useCatalog';
export function CirclesPage() {
  const { t } = useI18n();
  const resource = useCatalog();
  return (
    <>
      <PageHeader title={t('circles.title')} subtitle={t('circles.subtitle')} />
      <p className="notice">{t('circles.noActions')}</p>
      <SectionHeader title={t('circles.yours')} />
      <ResourceView resource={resource}>
        {(data) => (
          <div className="circle-grid">
            {data.circles.map((circle) => (
              <Card key={circle.id}>
                <h2>{circle.title}</h2>
                <p className="muted">
                  {t('circles.members', { count: circle.memberCount })}
                </p>
                {data.posts
                  .filter((p) => p.circleId === circle.id)
                  .map((post) => (
                    <div className="circle-activity" key={post.id}>
                      <span className="eyebrow">
                        {t(
                          post.type === 'question'
                            ? 'circles.question'
                            : post.type === 'progress'
                              ? 'circles.progress'
                              : 'circles.experience',
                        )}
                      </span>
                      <p>{post.text}</p>
                      <small>
                        {
                          data.users.find((u) => u.id === post.userId)
                            ?.displayName
                        }
                      </small>
                    </div>
                  ))}
                <h3>{t('circles.similar')}</h3>
                <div className="avatar-group">
                  {circle.similarMemberIds.map((id) => {
                    const user = data.users.find((u) => u.id === id);
                    return user && <Avatar key={id} name={user.displayName} />;
                  })}
                </div>
                <p className="demo-caption">{t('circles.similarNotice')}</p>
              </Card>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
