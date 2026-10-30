import { Bookmark } from 'lucide-react';
import type {
  Program,
  ProgramProgress,
  ProgramSession,
} from '../../data/models';
import { useI18n } from '../../i18n';
import { Card, IconButton, ProgressBar } from '../components';
export function ProgramCard({
  program,
  progress,
  saved,
  inLibrary,
  onSave,
}: {
  program: Program;
  progress?: ProgramProgress;
  saved?: boolean;
  inLibrary?: boolean;
  onSave?: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <Card
      className={`program-card category-${program.activityType.toLowerCase()}`}
    >
      <div className="program-cover">
        <img src={program.thumbnailUrl} alt="" />
        <span>{t(`activity.${program.activityType}`)}</span>
      </div>
      <div className="program-body">
        <p className="eyebrow">
          {t('program.sessions', { count: program.sessionCount })}
        </p>
        <div className="program-title">
          <h3>{program.title}</h3>
          {onSave && (
            <IconButton
              label={
                inLibrary && !saved
                  ? t('program.inLibrary')
                  : saved
                    ? t('program.unsave')
                    : t('program.save')
              }
              disabled={inLibrary && !saved}
              aria-pressed={saved}
              onClick={onSave}
            >
              <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
            </IconButton>
          )}
        </div>
        <p>{t('program.by', { creator: program.creator.name })}</p>
        <p>
          {t('program.duration', { count: program.averageDurationMinutes })} ·{' '}
          {t(
            program.difficulty === 'beginner'
              ? 'program.beginner'
              : 'program.intermediate',
          )}
        </p>
        <p>
          {program.rating === null
            ? t('program.unrated')
            : t('program.rating', {
                rating: new Intl.NumberFormat(locale).format(program.rating),
                count: program.reviewCount,
              })}
        </p>
        {progress && (
          <ProgressBar value={progress.percent} label={t('program.progress')} />
        )}
      </div>
    </Card>
  );
}
export function SessionCard({ session }: { session: ProgramSession }) {
  const { t } = useI18n();
  return (
    <Card className="session-card">
      <div>
        <p className="eyebrow">{t('demo.session')}</p>
        <h3>{session.title}</h3>
        <p>{t('program.duration', { count: session.durationMinutes })}</p>
      </div>
    </Card>
  );
}
