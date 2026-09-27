import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatusBadge } from '@/modules/video/presentation/StatusBadge';

import type { ChatVideo } from '../viewmodels/parse-tool-result';
import { useChatVideo } from '../viewmodels/useChatVideo';

/** Beyond this the strip stops being scannable; the rest live in the library. */
const MAX_TILES = 8;

interface ChatVideoStripProps {
  videos: ChatVideo[];
}

/**
 * Several videos at once — from `list_videos`. Thumbnails rather than players:
 * the point here is recognising which one you meant, not watching them.
 */
export function ChatVideoStrip({ videos }: ChatVideoStripProps) {
  const shown = videos.slice(0, MAX_TILES);
  const overflow = videos.length - shown.length;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {shown.map((video) => (
        <ChatVideoTile key={video.id} video={video} />
      ))}

      {overflow > 0 && (
        <Link
          to="/library"
          className="flex w-40 shrink-0 items-center justify-center rounded-lg border border-line-subtle bg-surface text-xs font-medium text-content-secondary transition-colors hover:border-brand/30 hover:text-content"
        >
          +{overflow} more
        </Link>
      )}
    </div>
  );
}

function ChatVideoTile({ video: seed }: { video: ChatVideo }) {
  const video = useChatVideo(seed);

  return (
    <Link
      to={`/videos/${video.id}`}
      title={video.prompt ?? undefined}
      className="w-40 shrink-0 overflow-hidden rounded-lg border border-line-subtle bg-surface transition-colors hover:border-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="relative aspect-video bg-sunken">
        {video.status === 'ready' && video.resultUrl ? (
          <video
            src={video.resultUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-dark">
            <Play className="h-5 w-5 text-white/20" />
          </div>
        )}
        <div className="absolute right-1.5 top-1.5">
          <StatusBadge status={video.status} />
        </div>
      </div>
      <p className="line-clamp-2 px-2 py-1.5 text-xs text-content-secondary">
        {video.prompt ?? 'Untitled'}
      </p>
    </Link>
  );
}
