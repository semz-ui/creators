import { Badge, type BadgeTone } from '@/shared/ui';

import type { DistributionStatus, PublicationStatus } from '../data/publishing.types';

const PUBLICATION: Record<PublicationStatus, { label: string; tone: BadgeTone }> = {
  scheduled: { label: 'Scheduled', tone: 'info' },
  publishing: { label: 'Publishing', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  partially_failed: { label: 'Partially failed', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
};

export function PublicationStatusBadge({ status }: { status: PublicationStatus }) {
  return <Badge label={PUBLICATION[status].label} tone={PUBLICATION[status].tone} />;
}

const TARGET: Record<DistributionStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  published: { label: 'Published', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
};

export function TargetStatusBadge({ status }: { status: DistributionStatus }) {
  return <Badge label={TARGET[status].label} tone={TARGET[status].tone} />;
}
