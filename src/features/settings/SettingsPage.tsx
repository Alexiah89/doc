import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useRepositories } from '../../app/providers/RepositoryProvider';
import {
  Button,
  Card,
  ErrorState,
  PageHeader,
} from '../../design-system/components';
import { useI18n } from '../../i18n';
import type { DemoSettings, Locale, Visibility } from '../../data/models';
import { durationOptions } from '../onboarding/OnboardingPage';
export function SettingsPage() {
  const { settings } = useRepositories();
  const { t, setLocale } = useI18n();
  const [value, setValue] = useState(() => settings.getSettings());
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  function update(next: Partial<DemoSettings>) {
    setValue((old) => ({ ...old, ...next }));
    setSaved(false);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      settings.saveSettings(value);
      setLocale(value.locale);
      setSaved(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  return (
    <>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />
      <form onSubmit={submit} className="settings-form">
        <Card>
          <h2>{t('settings.account')}</h2>
          <p>{t('auth.demoAccountNotice')}</p>
          <div className="actions">
            <Link to="/login">{t('auth.google')}</Link>
          </div>
          <Link to="/onboarding">{t('onboarding.edit')}</Link>
        </Card>
        <Card>
          <h2>{t('settings.privacy')}</h2>
          <label>
            {t('onboarding.privacy')}
            <select
              value={value.privacy}
              onChange={(e) =>
                update({ privacy: e.target.value as Visibility })
              }
            >
              {(['private', 'followers', 'public'] as const).map((x) => (
                <option key={x} value={x}>
                  {t(`privacy.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="notice">{t('privacy.notes')}</p>
        </Card>
        <Card>
          <h2>{t('settings.training')}</h2>
          <label>
            {t('onboarding.duration')}
            <select
              value={value.duration}
              onChange={(e) => update({ duration: e.target.value })}
            >
              {durationOptions.map((x) => (
                <option key={x} value={x}>
                  {t(`duration.${x}`)}
                </option>
              ))}
            </select>
          </label>
        </Card>
        <Card>
          <h2>{t('settings.programs')}</h2>
          <p>{t('settings.programsHint')}</p>
        </Card>
        <Card>
          <h2>{t('settings.circles')}</h2>
          <label>
            {t('settings.privacy')}
            <select
              value={value.circleVisibility}
              onChange={(e) =>
                update({
                  circleVisibility: e.target.value as 'private' | 'members',
                })
              }
            >
              {(['private', 'members'] as const).map((x) => (
                <option value={x} key={x}>
                  {t(`privacy.${x}`)}
                </option>
              ))}
            </select>
          </label>
        </Card>
        <Card>
          <h2>{t('settings.notifications')}</h2>
          <label className="option">
            <input
              type="checkbox"
              checked={value.notifications}
              onChange={(e) => update({ notifications: e.target.checked })}
            />
            {t('settings.notificationsLabel')}
          </label>
          <p>{t('settings.notificationsHint')}</p>
        </Card>
        <Card>
          <h2>{t('settings.appearance')}</h2>
          <label>
            {t('settings.appearance')}
            <select
              value={value.appearance}
              onChange={(e) =>
                update({ appearance: e.target.value as 'system' | 'light' })
              }
            >
              {(['system', 'light'] as const).map((x) => (
                <option key={x} value={x}>
                  {t(`settings.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <p>{t('settings.appearanceHint')}</p>
        </Card>
        <Card>
          <h2>{t('settings.language')}</h2>
          <label>
            {t('settings.languageLabel')}
            <select
              value={value.locale}
              onChange={(e) => update({ locale: e.target.value as Locale })}
            >
              {(['de-DE', 'en-US'] as const).map((x) => (
                <option key={x} value={x}>
                  {t(`language.${x}`)}
                </option>
              ))}
            </select>
          </label>
        </Card>
        {(['data', 'help', 'legal'] as const).map((x) => (
          <Card key={x}>
            <h2>{t(`settings.${x}`)}</h2>
            <p>{t(`settings.${x}Hint`)}</p>
          </Card>
        ))}
        {failed && <ErrorState inline description={t('common.saveError')} />}
        <Button type="submit">{t('settings.save')}</Button>
        {saved && (
          <p role="status" className="notice">
            {t('settings.saved')}
          </p>
        )}
      </form>
    </>
  );
}
