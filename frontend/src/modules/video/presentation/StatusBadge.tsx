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

const DOT_COLOR: Record<VideoStatus, string> = {
  queued: 'bg-info',
  processing: 'bg-warning animate-pulse',
  ready: 'bg-success shadow-glow-success',
  failed: 'bg-danger shadow-glow-danger',
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  return (
    <Badge tone={TONE[status]}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_COLOR[status]}`} />
      {LABEL[status]}
    </Badge>
  );
}
