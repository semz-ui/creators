import { motion } from 'framer-motion';
import { AlertTriangle, BarChart2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatusBadge } from '@/modules/video/presentation/StatusBadge';
import { Spinner } from '@/shared/ui';

import type { ChatVideo } from '../viewmodels/parse-tool-result';
import { useChatVideo } from '../viewmodels/useChatVideo';

interface ChatVideoCardProps {
  /** The video as the tool reported it; kept live while it is still generating. */
  video: ChatVideo;
}

/**
 * A video, playable inline in the transcript.
 *
 * The whole point of the assistant is that you never have to leave the chat to
 * see what it made — so a finished video plays here, and one that is still
 * generating updates itself in place.
 */
export function ChatVideoCard({ video: seed }: ChatVideoCardProps) {
  const video = useChatVideo(seed);
  const caption = video.prompt ?? 'Your video';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-md overflow-hidden rounded-xl border border-line-subtle bg-surface"
    >
      <div className="relative aspect-video w-full bg-sunken">{renderMedia(video)}</div>

      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm text-content">{caption}</p>
          {video.durationSeconds !== null && (
            <p className="mt-0.5 font-mono text-xs text-content-muted">{video.durationSeconds}s</p>
          )}
        </div>
        <div className="shrink-0">
          <StatusBadge status={video.status} />
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-line-subtle px-2 py-1.5">
        {/* Always a way out of the chat to the video itself, whatever its state. */}
        <Link
          to={`/videos/${video.id}`}
          className="rounded-md px-2 py-1 text-xs font-medium text-content-secondary transition-colors hover:bg-white/5 hover:text-content"
        >
          Open
        </Link>
        {video.status === 'ready' && (
          <>
            <Link
              to={`/videos/${video.id}/analytics`}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-content-secondary transition-colors hover:bg-white/5 hover:text-content"
            >
              <BarChart2 className="h-3 w-3" />
              Analytics
            </Link>
            <Link
              to={`/videos/${video.id}/publish`}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/10"
            >
              <Send className="h-3 w-3" />
              Publish
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
}

function renderMedia(video: ChatVideo) {
  if (video.status === 'ready' && video.resultUrl) {
    return (
      <video
        src={video.resultUrl}
        controls
        playsInline
        preload="metadata"
        aria-label={video.prompt ?? 'Generated video'}
        className="h-full w-full bg-black"
      />
    );
  }

  if (video.status === 'failed') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-dark px-4 text-center">
        <AlertTriangle className="h-6 w-6 text-danger" />
        <p className="text-xs text-content-secondary">
          {video.error ?? "This one didn't make it through generation."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-dark">
      <Spinner />
      <p className="text-xs text-content-secondary">Generating…</p>
      {/* Poll-driven, so it fills in on its own once the render finishes. */}
      <p className="text-[11px] text-content-muted">This updates itself</p>
    </div>
  );
}
