import { Badge, type BadgeTone } from '@/shared/ui';

import type { VideoStatus } from '../data/video.types';

const STATUS: Record<VideoStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: 'Queued', tone: 'neutral' },
  processing: { label: 'Generating', tone: 'info' },
  ready: { label: 'Ready', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  return <Badge label={STATUS[status].label} tone={STATUS[status].tone} />;
}
