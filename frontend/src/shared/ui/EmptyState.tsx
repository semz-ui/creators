import type { ReactNode } from 'react';

import { Card } from './Card';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Consistent empty-state card with an optional action. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="text-center">
      <p className="font-medium text-content">{title}</p>
      {description && <p className="mt-1 text-sm text-content-secondary">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
