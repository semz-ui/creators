import { Badge, type BadgeTone } from '@/shared/ui';

import type { VideoStatus } from '../data/video.types';

const TONE: Record<VideoStatus, BadgeTone> = {
  queued: 'info',
  processing: 'warning',
  ready: 'success',
  failed: 'danger',
};

const LABEL: Record<VideoStatus, string> = {
  queued: 'Queued',
  processing: 'Generating',
  ready: 'Ready',
  failed: 'Failed',
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
