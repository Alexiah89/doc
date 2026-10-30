import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositories } from '../../app/providers/RepositoryProvider';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  PageHeader,
  ProgressBar,
} from '../../design-system/components';
import { useI18n } from '../../i18n';
import { useSession } from '../../app/providers/SessionProvider';
import { ApiRequestError } from '../../data/api/client';
import type {
  ActivityType,
  OnboardingState,
  Visibility,
} from '../../data/models';
export const durationOptions = [
  'short',
  'medium',
  'long',
  'extended',
  'varied',
] as const;
export const frequencyOptions = [
  'light',
  'regular',
  'often',
  'daily',
  'flexible',
] as const;
const priorityOptions = [
  'flexibility',
  'relaxation',
  'back',
  'strength',
  'morning',
  'evening',
  'restart',
  'consistency',
] as const;
export function OnboardingPage() {
  const { settings } = useRepositories();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [state, setState] = useState(() => settings.getOnboarding());
  const session = useSession();
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const lock = useRef(false);
  const pending = useRef<OnboardingState | null>(null);
  async function persist(next: OnboardingState) {
    if (lock.current) return false;
    lock.current = true;
    setSaving(true);
    next = { ...next, completed: next.step === 3 && next.completed };
    pending.current = next;
    try {
      await settings.saveOnboarding(next);
      setState(next);
      setFailed(false);
      setConflict(false);
      pending.current = null;
      return true;
    } catch (error) {
      const isConflict =
        error instanceof ApiRequestError &&
        error.error.code === 'account-conflict';
      setConflict(isConflict);
      setFailed(true);
      if (isConflict) {
        setState(settings.getOnboarding());
        pending.current = null;
      }
      return false;
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  async function move() {
    if (state.step === 3) {
      if (await persist({ ...state, completed: true })) navigate('/home');
    } else await persist({ ...state, step: state.step + 1 });
  }
  function toggleActivity(value: ActivityType) {
    const values = state.preferences.activities;
    persist({
      ...state,
      preferences: {
        ...state.preferences,
        activities: values.includes(value)
          ? values.filter((x) => x !== value)
          : [...values, value],
      },
    });
  }
  const titles = [
    'onboarding.interests',
    'onboarding.routine',
    'onboarding.priorities',
    'onboarding.privacy',
  ] as const;
  return (
    <section className="onboarding">
      <PageHeader
        title={t('onboarding.title')}
        subtitle={t(
          session.mode === 'demo'
            ? 'onboarding.local'
            : 'account.onboardingSynced',
        )}
      />
      <Card>
        <fieldset className="onboarding-fields" disabled={saving}>
          <p className="eyebrow">
            {t('onboarding.step', { current: state.step + 1 })}
          </p>
          <ProgressBar
            value={(state.step + 1) * 25}
            label={t('onboarding.title')}
          />
          <h2>{t(titles[state.step])}</h2>
          {state.step === 0 && (
            <div className="chips">
              {(['Yoga', 'Pilates', 'Mobility', 'Stretching'] as const).map(
                (value) => (
                  <Chip
                    key={value}
                    selected={state.preferences.activities.includes(value)}
                    onClick={() => toggleActivity(value)}
                  >
                    {t(`activity.${value}`)}
                  </Chip>
                ),
              )}
            </div>
          )}
          {state.step === 1 && (
            <>
              <fieldset>
                <legend>{t('onboarding.duration')}</legend>
                {durationOptions.map((value) => (
                  <label className="option" key={value}>
                    <input
                      type="radio"
                      name="duration"
                      value={value}
                      checked={state.preferences.duration === value}
                      onChange={() =>
                        persist({
                          ...state,
                          preferences: {
                            ...state.preferences,
                            duration: value,
                          },
                        })
                      }
                    />
                    {t(`duration.${value}`)}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>{t('onboarding.frequency')}</legend>
                {frequencyOptions.map((value) => (
                  <label className="option" key={value}>
                    <input
                      type="radio"
                      name="frequency"
                      value={value}
                      checked={state.preferences.frequency === value}
                      onChange={() =>
                        persist({
                          ...state,
                          preferences: {
                            ...state.preferences,
                            frequency: value,
                          },
                        })
                      }
                    />
                    {t(`frequency.${value}`)}
                  </label>
                ))}
              </fieldset>
            </>
          )}
          {state.step === 2 && (
            <div className="chips">
              {priorityOptions.map((value) => (
                <Chip
                  key={value}
                  selected={state.preferences.priorities.includes(value)}
                  onClick={() =>
                    persist({
                      ...state,
                      preferences: {
                        ...state.preferences,
                        priorities: state.preferences.priorities.includes(value)
                          ? state.preferences.priorities.filter(
                              (x) => x !== value,
                            )
                          : [...state.preferences.priorities, value],
                      },
                    })
                  }
                >
                  {t(`priority.${value}`)}
                </Chip>
              ))}
            </div>
          )}
          {state.step === 3 && (
            <fieldset>
              <legend className="sr-only">{t('onboarding.privacy')}</legend>
              {(['private', 'followers', 'public'] as Visibility[]).map(
                (value) => (
                  <label className="option" key={value}>
                    <input
                      type="radio"
                      name="privacy"
                      checked={state.privacy === value}
                      onChange={() => persist({ ...state, privacy: value })}
                    />
                    {t(`privacy.${value}`)}
                  </label>
                ),
              )}
              <p className="notice">{t('privacy.notes')}</p>
              {session.mode === 'live' && (
                <p>{t('account.noAutomaticSharing')}</p>
              )}
            </fieldset>
          )}
          {failed && (
            <ErrorState
              inline
              description={t(
                conflict
                  ? 'account.conflict'
                  : session.mode === 'demo'
                    ? 'common.saveError'
                    : 'account.saveFailed',
              )}
              onRetry={() => {
                if (pending.current) void persist(pending.current);
                else {
                  setState(settings.getOnboarding());
                  setFailed(false);
                }
              }}
            />
          )}
          <div className="actions">
            <Button
              variant="ghost"
              disabled={state.step === 0}
              onClick={() => persist({ ...state, step: state.step - 1 })}
            >
              {t('onboarding.back')}
            </Button>
            <Button variant="ghost" onClick={() => void move()}>
              {t('onboarding.skip')}
            </Button>
            <Button onClick={() => void move()}>
              {t(
                state.step === 3
                  ? session.mode === 'demo'
                    ? 'onboarding.finish'
                    : 'account.finishOnboarding'
                  : 'onboarding.next',
              )}
            </Button>
          </div>
        </fieldset>
      </Card>
    </section>
  );
}
