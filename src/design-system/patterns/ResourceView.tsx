import type { ReactNode } from 'react';
import { ErrorState, LoadingState } from '../components';
export function ResourceView<T>({
  resource,
  children,
}: {
  resource: {
    data: T | undefined;
    loading: boolean;
    error: boolean;
    retry: () => void;
  };
  children: (data: T) => ReactNode;
}) {
  if (resource.loading) return <LoadingState />;
  if (resource.error || resource.data === undefined)
    return <ErrorState onRetry={resource.retry} />;
  return children(resource.data);
}
