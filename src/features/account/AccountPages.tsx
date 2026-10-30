import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../app/providers/SessionProvider';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionHeader,
} from '../../design-system/components';
import { useI18n, type TranslationKey } from '../../i18n';
import { ApiRequestError } from '../../data/api/client';
export function AccountHomePage() {
  const session = useSession();
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        title={t('account.welcome', {
          name: session.account?.displayName ?? '',
        })}
        subtitle={t('account.connected')}
      />
      <Card>
        <h2>{t('account.onboardingSaved')}</h2>
        <p>{t('account.savedDescription')}</p>
        <Link to="/onboarding">{t('account.editOnboarding')}</Link>
      </Card>
      <SectionHeader title={t('home.next')} />
      <EmptyState
        title={t('account.noPrograms')}
        description={t('account.programsLater')}
      />
    </>
  );
}
export function AccountProfilePage() {
  const { account } = useSession();
  const { t } = useI18n();
  if (!account) return null;
  return (
    <>
      <PageHeader
        title={t('profile.title')}
        subtitle={t('account.realProfile')}
      >
        <Link to="/settings">{t('nav.settings')}</Link>
      </PageHeader>
      <Card className="profile-intro">
        <Avatar name={account.displayName} />
        <div>
          <h2>{account.displayName}</h2>
          <p>@{account.username}</p>
          <p>{account.bio}</p>
          <span className="badge">
            {t(`privacy.${account.onboarding.privacy}`)}
          </span>
        </div>
      </Card>
      <SectionHeader title={t('profile.interests')} />
      <Card>
        <div className="chips">
          {account.onboarding.preferences.activities.map((value) => (
            <span className="badge" key={value}>
              {t(`activity.${value}`)}
            </span>
          ))}
        </div>
        <p>{t('privacy.notes')}</p>
        <Link to="/onboarding">{t('account.editOnboarding')}</Link>
      </Card>
      <p className="muted">{t('account.socialLater')}</p>
    </>
  );
}
export function AccountSettingsPage() {
  const session = useSession();
  const { t } = useI18n();
  const [name, setName] = useState(session.account?.displayName ?? '');
  const [bio, setBio] = useState(session.account?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!session.client) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await session.client.saveProfile({ displayName: name, bio });
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError &&
          cause.error.code === 'account-conflict'
          ? 'account.conflict'
          : 'account.saveFailed',
      );
      if (session.client) {
        const current = session.client.snapshot();
        setName(current.displayName);
        setBio(current.bio);
      }
    } finally {
      setSaving(false);
    }
  }
  async function logout() {
    setError(null);
    try {
      await session.signOut();
    } catch {
      setError('auth.signOutFailed');
    }
  }
  return (
    <>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('account.connected')}
      />
      <Card>
        <h2>{t('settings.account')}</h2>
        <form onSubmit={(event) => void save(event)}>
          <fieldset disabled={saving}>
            <label>
              {t('account.displayName')}
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <label>
              {t('account.bio')}
              <textarea
                maxLength={280}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
          </fieldset>
          <Button type="submit" loading={saving}>
            {t('account.save')}
          </Button>
        </form>
        {saved && (
          <p role="status" className="notice">
            {t('account.saved')}
          </p>
        )}
      </Card>
      <Card>
        <h2>{t('settings.privacy')}</h2>
        <p>{t('privacy.notes')}</p>
        <p>{t('account.noAutomaticSharing')}</p>
        <Link to="/onboarding">{t('account.editOnboarding')}</Link>
      </Card>
      {error && <ErrorState inline description={t(error)} />}
      <div className="actions">
        <Button variant="secondary" onClick={() => void logout()}>
          {t('auth.signOut')}
        </Button>
      </div>
    </>
  );
}
export function AccountPendingPage({ title }: { title: TranslationKey }) {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t(title)} />
      <EmptyState
        title={t('common.notImplemented')}
        description={t('account.programsLater')}
      />
    </>
  );
}
