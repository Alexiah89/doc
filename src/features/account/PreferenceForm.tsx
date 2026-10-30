import { useState, type FormEvent } from 'react';
import {
  activityTypes,
  durations,
  frequencies,
  trainingFocus,
  canonicalPreferences,
  canonicalVisibility,
  type ProfileVisibility,
} from '../../../shared/users';
import { useSession } from '../../app/providers/SessionProvider';
import { useI18n, type TranslationKey } from '../../i18n';
import { Button, Card, ErrorState } from '../../design-system/components';
import { ApiRequestError } from '../../data/api/client';
const activityLabels = {
  yoga: 'activity.Yoga',
  pilates: 'activity.Pilates',
  mobility: 'activity.Mobility',
  stretching: 'activity.Stretching',
} as const;
const durationLabels = {
  under_15: 'duration.short',
  '15_25': 'duration.medium',
  '25_40': 'duration.long',
  over_40: 'duration.extended',
  varies: 'duration.varied',
} as const;
const frequencyLabels = {
  '1_2_per_week': 'frequency.light',
  '3_per_week': 'frequency.regular',
  '4_5_per_week': 'frequency.often',
  almost_daily: 'frequency.daily',
  no_fixed_goal: 'frequency.flexible',
} as const;
const focusLabels = {
  flexibility: 'priority.flexibility',
  relaxation: 'priority.relaxation',
  back_neck: 'priority.back',
  strength_stability: 'priority.strength',
  morning_routine: 'priority.morning',
  evening_routine: 'priority.evening',
  returning: 'priority.restart',
  consistency: 'priority.consistency',
} as const;
export function PreferenceForm() {
  const session = useSession();
  const { t, setLocale } = useI18n();
  const [preferences, setPreferences] = useState(() =>
    canonicalPreferences(session.account!.onboarding),
  );
  const [locale, setLanguage] = useState(session.account?.locale ?? 'de-DE');
  const [visibility, setVisibility] = useState<ProfileVisibility>(() =>
    canonicalVisibility(session.account!.onboarding.privacy),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !session.client) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await session.client.savePreferences({ ...preferences, locale });
      await session.client.savePrivacy(visibility);
      setLocale(locale);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError &&
          cause.error.code === 'account-conflict'
          ? 'account.conflict'
          : 'account.saveFailed',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <h2>{t('settings.training')}</h2>
      <form onSubmit={(e) => void submit(e)}>
        <fieldset
          disabled={saving}
          onChange={() => setSaved(false)}
          aria-describedby={error ? 'preferences-error' : undefined}
        >
          <fieldset>
            <legend>{t('profile.interests')}</legend>
            {activityTypes.map((value) => (
              <label className="option" key={value}>
                <input
                  type="checkbox"
                  checked={preferences.activityTypes.includes(value)}
                  onChange={(e) =>
                    setPreferences((p) => ({
                      ...p,
                      activityTypes: e.target.checked
                        ? [...p.activityTypes, value]
                        : p.activityTypes.filter((x) => x !== value),
                    }))
                  }
                />
                {t(activityLabels[value])}
              </label>
            ))}
          </fieldset>
          <label>
            {t('onboarding.duration')}
            <select
              value={preferences.preferredSessionDuration}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferredSessionDuration: e.target
                    .value as (typeof durations)[number],
                }))
              }
            >
              {durations.map((x) => (
                <option key={x} value={x}>
                  {t(durationLabels[x])}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('onboarding.frequency')}
            <select
              value={preferences.preferredFrequency}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  preferredFrequency: e.target
                    .value as (typeof frequencies)[number],
                }))
              }
            >
              {frequencies.map((x) => (
                <option key={x} value={x}>
                  {t(frequencyLabels[x])}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>{t('onboarding.priorities')}</legend>
            {trainingFocus.map((value) => (
              <label className="option" key={value}>
                <input
                  type="checkbox"
                  checked={preferences.trainingFocus.includes(value)}
                  onChange={(e) =>
                    setPreferences((p) => ({
                      ...p,
                      trainingFocus: e.target.checked
                        ? [...p.trainingFocus, value]
                        : p.trainingFocus.filter((x) => x !== value),
                    }))
                  }
                />
                {t(focusLabels[value])}
              </label>
            ))}
          </fieldset>
          <label>
            {t('settings.languageLabel')}
            <select
              value={locale}
              onChange={(e) => setLanguage(e.target.value as 'de-DE' | 'en-US')}
            >
              <option value="de-DE">{t('language.de-DE')}</option>
              <option value="en-US">{t('language.en-US')}</option>
            </select>
          </label>
          <label>
            {t('settings.privacy')}
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as ProfileVisibility)
              }
            >
              {(['private', 'protected', 'public'] as const).map((x) => (
                <option key={x} value={x}>
                  {t(x === 'protected' ? 'privacy.followers' : `privacy.${x}`)}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <Button type="submit" loading={saving}>
          {t('account.savePreferences')}
        </Button>
        {error && (
          <div id="preferences-error">
            <ErrorState inline description={t(error)} />
          </div>
        )}
        {saved && <p role="status">{t('account.preferencesSaved')}</p>}
      </form>
    </Card>
  );
}
