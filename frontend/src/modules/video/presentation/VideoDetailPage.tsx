import { motion } from 'framer-motion';
import { ArrowLeft, BarChart2, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Card, Spinner } from '@/shared/ui';

import type { Video } from '../data/video.types';
import { useVideo } from '../viewmodels/useVideo';
import { StatusBadge } from './StatusBadge';

export function VideoDetailPage() {
  const { id = '' } = useParams();
  const { data: video, isPending, isError } = useVideo(id);

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !video) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-content-secondary">We couldn&apos;t load that video.</p>
        <Link
          to="/library"
          className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to library
        </Link>
      </Card>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-3xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-sm text-content-secondary transition-colors hover:text-content"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Library
        </Link>
        <StatusBadge status={video.status} />
      </div>
      <Card>{renderBody(video)}</Card>
    </motion.div>
  );
}

function renderBody(video: Video) {
  if (video.status === 'ready' && video.resultUrl) {
    return (
      <div className="space-y-4">
        <video src={video.resultUrl} controls className="w-full rounded-lg bg-black" />
        <p className="text-content">{video.title ?? video.prompt}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-content-muted">{video.durationSeconds}s</p>
          <div className="flex items-center gap-2">
            <Link
              to={`/videos/${video.id}/analytics`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-content-secondary transition-colors hover:bg-white/5 hover:text-content"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Analytics
            </Link>
            <Link
              to={`/videos/${video.id}/publish`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-brand px-4 text-sm font-medium text-white shadow-glow-sm transition-shadow hover:shadow-glow-brand"
            >
              <Send className="h-3.5 w-3.5" />
              Publish
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (video.status === 'failed') {
    return (
      <div className="space-y-3 text-center">
        <h2 className="font-display text-xl text-content">Generation failed</h2>
        <p className="text-content-secondary">{video.error ?? 'Something went wrong.'}</p>
        <Link
          to="/create"
          className="inline-flex h-9 items-center rounded-lg bg-gradient-brand px-4 text-sm font-medium text-white shadow-glow-sm"
        >
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Spinner className="h-8 w-8" />
      <div>
        <h2 className="font-display text-xl text-content">Generating your video…</h2>
        <p className="mt-1 text-content-secondary">
          This usually takes a moment. We&apos;ll update automatically.
        </p>
      </div>
      <p className="max-w-md text-sm text-content-muted">{video.prompt}</p>
    </div>
  );
}
