import { useState } from 'react';
import { useRepositories } from '../../app/providers/RepositoryProvider';
import { useI18n } from '../../i18n';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionHeader,
} from '../../design-system/components';
import { ProgramCard } from '../../design-system/patterns/ProgramCard';
import { ResourceView } from '../../design-system/patterns/ResourceView';
import { useCatalog } from '../../hooks/useCatalog';
import type { ActivityType, Program } from '../../data/models';
export function DiscoverPage() {
  const resource = useCatalog();
  const { library } = useRepositories();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ActivityType>('all');
  const [notice, setNotice] = useState(false);
  const [failed, setFailed] = useState(false);
  async function save(id: string) {
    try {
      await library.toggleSaved(id);
      resource.retry();
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  return (
    <>
      <PageHeader
        title={t('discover.title')}
        subtitle={t('discover.subtitle')}
      />
      <label className="search-field">
        {t('discover.search')}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('discover.placeholder')}
        />
      </label>
      <div className="chips">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
          {t('discover.all')}
        </Chip>
        {(['Yoga', 'Pilates', 'Mobility', 'Stretching'] as const).map(
          (activity) => (
            <Chip
              key={activity}
              selected={filter === activity}
              onClick={() => setFilter(activity)}
            >
              {t(`activity.${activity}`)}
            </Chip>
          ),
        )}
      </div>
      <Button variant="secondary" onClick={() => setNotice(true)}>
        {t('discover.add')}
      </Button>
      {notice && (
        <div className="notice" role="status">
          <h2>{t('common.notImplemented')}</h2>
          <p>{t('discover.importNotice')}</p>
        </div>
      )}
      {failed && <ErrorState inline onRetry={() => setFailed(false)} />}
      <ResourceView resource={resource}>
        {(data) => {
          const list = data.programs.filter(
            (p) =>
              (filter === 'all' || p.activityType === filter) &&
              `${p.title} ${p.creator.name}`
                .toLocaleLowerCase()
                .includes(search.toLocaleLowerCase().trim()),
          );
          const groups: [string, Program[]][] = [
            [
              t('discover.popular'),
              [...list]
                .sort((a, b) => b.reviewCount - a.reviewCount)
                .slice(0, 3),
            ],
            [
              t('discover.beginner'),
              list.filter((p) => p.difficulty === 'beginner').slice(0, 3),
            ],
            [
              t('discover.short'),
              list.filter((p) => p.averageDurationMinutes < 20).slice(0, 3),
            ],
            ...(['Yoga', 'Pilates', 'Mobility', 'Stretching'] as const).map(
              (activity) =>
                [
                  t(`activity.${activity}`),
                  list.filter((p) => p.activityType === activity),
                ] as [string, Program[]],
            ),
            [
              t('discover.new'),
              [...list]
                .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
                .slice(0, 3),
            ],
          ];
          return list.length ? (
            groups
              .filter(([, items]) => items.length)
              .map(([name, items]) => (
                <section key={name}>
                  <SectionHeader title={name} />
                  <div className="program-grid">
                    {items.map((p) => {
                      const entry = data.library.find(
                        (x) => x.programId === p.id,
                      );
                      return (
                        <ProgramCard
                          key={p.id}
                          program={p}
                          saved={entry?.status === 'saved'}
                          inLibrary={!!entry}
                          onSave={() => void save(p.id)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))
          ) : (
            <EmptyState />
          );
        }}
      </ResourceView>
    </>
  );
}
