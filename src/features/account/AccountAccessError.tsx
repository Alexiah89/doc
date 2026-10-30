import { useSession } from '../../app/providers/SessionProvider';
import { ErrorState } from '../../design-system/components';
import { useI18n, type TranslationKey } from '../../i18n';
const messages: Readonly<Record<string, TranslationKey>> = {
  'firebase-project-id-missing': 'account.configProjectMissing',
  'firebase-project-id-invalid': 'account.configProjectInvalid',
  'firebase-service-account-json-invalid': 'account.configJsonInvalid',
  'firebase-service-account-fields-missing': 'account.configFieldsMissing',
  'firebase-project-mismatch': 'account.configProjectMismatch',
  'firebase-private-key-invalid': 'account.configPrivateKeyInvalid',
};
export function AccountAccessError() {
  const { t } = useI18n();
  const session = useSession();
  const description = t(
    messages[session.errorCode ?? ''] ?? 'account.unavailable',
  );
  return (
    <ErrorState
      description={
        description +
        (session.errorCode
          ? ` ${t('account.supportCode', { code: session.errorCode })}`
          : '')
      }
      onRetry={() => void session.reload()}
    />
  );
}
