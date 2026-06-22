import { Link } from 'react-router-dom';

import { Card } from '@/shared/ui';

import type { Video } from '../data/video.types';
import { StatusBadge } from './StatusBadge';

export function VideoCard({ video }: { video: Video }) {
  return (
    <Link to={`/videos/${video.id}`} className="block focus-visible:outline-none">
      <Card className="h-full p-4 transition-shadow hover:shadow-md">
        <div className="mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-sunken">
          {video.status === 'ready' && video.resultUrl ? (
            <video src={video.resultUrl} className="h-full w-full object-cover" muted />
          ) : (
            <span className="font-display text-2xl text-content-muted">▶</span>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm text-content">{video.title ?? video.prompt}</p>
          <StatusBadge status={video.status} />
        </div>
        <p className="mt-2 text-xs text-content-muted">{video.durationSeconds}s</p>
      </Card>
    </Link>
  );
}
