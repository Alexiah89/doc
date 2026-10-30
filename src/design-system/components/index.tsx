import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Flower2 } from 'lucide-react';
import { useI18n } from '../../i18n';
export function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  loading?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`button button-${variant} ${className}`}
    >
      {loading ? t('common.loading') : children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      {...props}
      className={`icon-button ${props.className ?? ''}`}
      aria-label={label}
    >
      {children}
    </Button>
  );
}
export function Card({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <article {...props} className={`card ${className}`}>
      {children}
    </article>
  );
}
export function Chip({
  selected = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <Button
      variant="ghost"
      {...props}
      aria-pressed={selected}
      className={`chip ${selected ? 'selected' : ''}`}
    />
  );
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div className="progress-wrap">
      <label>
        <span>{label}</span>
        <strong>{percent}%</strong>
        <progress aria-label={label} value={percent} max={100} />
      </label>
    </div>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-label={name}>
      {name.slice(0, 1)}
    </span>
  );
}
export function Skeleton() {
  return <div className="skeleton" aria-hidden="true" />;
}
export function LoadingState() {
  const { t } = useI18n();
  return (
    <div role="status">
      <p>{t('common.loading')}</p>
      <Skeleton />
    </div>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { t } = useI18n();
  return (
    <Card className="empty-state">
      <Flower2 aria-hidden="true" />
      <h2>{title ?? t('common.emptyTitle')}</h2>
      <p>{description ?? t('common.emptyDescription')}</p>
    </Card>
  );
}
export function ErrorState({
  onRetry,
  inline = false,
  title,
  description,
}: {
  onRetry?: () => void;
  inline?: boolean;
  title?: string;
  description?: string;
}) {
  const { t } = useI18n();
  return (
    <div role="alert" className={`error-state ${inline ? 'inline' : ''}`}>
      <h2>{title ?? t('common.errorTitle')}</h2>
      <p>{description ?? t('common.errorDescription')}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function SectionHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
