import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, CardGridSkeleton, EmptyState } from '@/shared/ui';

import { useVideoLibrary } from '../viewmodels/useVideoLibrary';
import { VideoCard } from './VideoCard';

const LIMIT = 12;

export function LibraryPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError } = useVideoLibrary(page, LIMIT);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-content">Library</h1>
        <Link
          to="/create"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-content-inverse hover:bg-brand-hover"
        >
          New video
        </Link>
      </div>

      {isPending ? (
        <CardGridSkeleton />
      ) : isError ? (
        <p className="text-content-secondary">Couldn&apos;t load your videos.</p>
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No videos yet"
          description="Generate your first video from a prompt."
          action={
            <Link
              to="/create"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-content-inverse hover:bg-brand-hover"
            >
              Create a video
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-content-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
