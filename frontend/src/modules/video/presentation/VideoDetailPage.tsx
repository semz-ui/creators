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
        <Link to="/library" className="mt-2 inline-block text-sm text-brand hover:underline">
          ← Back to library
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/library" className="text-sm text-brand hover:underline">
          ← Library
        </Link>
        <StatusBadge status={video.status} />
      </div>
      <Card>{renderBody(video)}</Card>
    </div>
  );
}

function renderBody(video: Video) {
  if (video.status === 'ready' && video.resultUrl) {
    return (
      <div className="space-y-4">
        <video src={video.resultUrl} controls className="w-full rounded-lg bg-black" />
        <p className="text-content">{video.prompt}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-content-muted">{video.durationSeconds}s</p>
          <div className="flex items-center gap-2">
            <Link
              to={`/videos/${video.id}/analytics`}
              className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-content hover:bg-sunken"
            >
              Analytics
            </Link>
            <Link
              to={`/videos/${video.id}/publish`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-content-inverse hover:bg-brand-hover"
            >
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
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-content-inverse hover:bg-brand-hover"
        >
          Try again
        </Link>
      </div>
    );
  }

  // queued / processing
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
