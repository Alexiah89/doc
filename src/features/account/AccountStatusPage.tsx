import { Button, Card, PageHeader } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { useSession } from '../../app/providers/SessionProvider';
import { useState } from 'react';
export function AccountStatusPage() {
  const { t } = useI18n();
  const session = useSession();
  const [failed, setFailed] = useState(false);
  return (
    <>
      <PageHeader title={t('status.title')} />
      <Card>
        <h2>
          {t(
            session.errorCode === 'account-deletion-pending'
              ? 'status.pending'
              : session.errorCode === 'account-deleted'
                ? 'status.deleted'
                : 'status.suspended',
          )}
        </h2>
        <p>{t('status.description')}</p>
        <Button
          loading={session.loggingOut}
          onClick={() => void session.signOut().catch(() => setFailed(true))}
        >
          {t('auth.signOut')}
        </Button>
        {failed && <p role="alert">{t('auth.signOutFailed')}</p>}
      </Card>
    </>
  );
}
