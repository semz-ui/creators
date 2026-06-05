import { Badge, type BadgeTone } from '@/shared/ui';

import type { DistributionStatus, PublicationStatus } from '../data/publishing.types';

const PUB_TONE: Record<PublicationStatus, BadgeTone> = {
  scheduled: 'info',
  publishing: 'warning',
  completed: 'success',
  partially_failed: 'warning',
  failed: 'danger',
};

const PUB_LABEL: Record<PublicationStatus, string> = {
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  completed: 'Completed',
  partially_failed: 'Partially failed',
  failed: 'Failed',
};

export function PublicationStatusBadge({ status }: { status: PublicationStatus }) {
  return <Badge tone={PUB_TONE[status]}>{PUB_LABEL[status]}</Badge>;
}

const TARGET_TONE: Record<DistributionStatus, BadgeTone> = {
  pending: 'neutral',
  published: 'success',
  failed: 'danger',
};

const TARGET_LABEL: Record<DistributionStatus, string> = {
  pending: 'Pending',
  published: 'Published',
  failed: 'Failed',
};

export function TargetStatusBadge({ status }: { status: DistributionStatus }) {
  return <Badge tone={TARGET_TONE[status]}>{TARGET_LABEL[status]}</Badge>;
}
