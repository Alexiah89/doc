import { useState } from 'react';
import {
  Card,
  Chip,
  EmptyState,
  PageHeader,
  ProgressBar,
} from '../../design-system/components';
import { ProgramCard } from '../../design-system/patterns/ProgramCard';
import { ResourceView } from '../../design-system/patterns/ResourceView';
import { useCatalog } from '../../hooks/useCatalog';
import { useI18n } from '../../i18n';
import type { LibraryStatus } from '../../data/models';
export function LibraryPage() {
  const { t } = useI18n();
  const resource = useCatalog();
  const [tab, setTab] = useState<LibraryStatus | 'favorites'>('active');
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('recent');
  return (
    <>
      <PageHeader title={t('library.title')} subtitle={t('library.subtitle')} />
      <div className="chips" role="group" aria-label={t('library.title')}>
        {(['active', 'saved', 'paused', 'completed', 'favorites'] as const).map(
          (value) => (
            <Chip
              key={value}
              selected={value === tab}
              onClick={() => setTab(value)}
            >
              {t(`library.${value}`)}
            </Chip>
          ),
        )}
      </div>
      <div className="toolbar">
        <label>
          {t('library.view')}
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="grid">{t('library.grid')}</option>
            <option value="list">{t('library.list')}</option>
          </select>
        </label>
        <label>
          {t('library.sort')}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">{t('library.sortRecent')}</option>
            <option value="title">{t('library.sortTitle')}</option>
            <option value="progress">{t('library.sortProgress')}</option>
          </select>
        </label>
      </div>
      <ResourceView resource={resource}>
        {(data) => {
          const items = data.library
            .filter((entry) =>
              tab === 'favorites' ? entry.favorite : entry.status === tab,
            )
            .flatMap((entry) => {
              const program = data.programs.find(
                (x) => x.id === entry.programId,
              );
              return program ? [{ entry, program }] : [];
            })
            .sort((a, b) =>
              sort === 'title'
                ? a.program.title.localeCompare(b.program.title)
                : sort === 'progress'
                  ? b.entry.progress.percent - a.entry.progress.percent
                  : b.entry.savedAt.localeCompare(a.entry.savedAt),
            );
          return items.length ? (
            <div className={view === 'grid' ? 'program-grid' : 'program-list'}>
              {items.map(({ entry, program }) =>
                view === 'grid' ? (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    progress={entry.progress}
                  />
                ) : (
                  <Card className="library-row" key={program.id}>
                    <div>
                      <h3>{program.title}</h3>
                      <p>
                        {t('program.by', { creator: program.creator.name })}
                      </p>
                    </div>
                    <ProgressBar
                      value={entry.progress.percent}
                      label={t('program.progress')}
                    />
                  </Card>
                ),
              )}
            </div>
          ) : (
            <EmptyState />
          );
        }}
      </ResourceView>
    </>
  );
}
