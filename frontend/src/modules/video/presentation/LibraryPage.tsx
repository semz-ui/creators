import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Film, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, CardGridSkeleton, EmptyState } from '@/shared/ui';

import { useVideoLibrary } from '../viewmodels/useVideoLibrary';
import { VideoCard } from './VideoCard';

const LIMIT = 12;

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export function LibraryPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError } = useVideoLibrary(page, LIMIT);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <motion.div
        className="mb-6 flex items-center justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="font-display text-3xl font-bold text-content">Library</h1>
        <Link
          to="/create"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-brand px-4 text-sm font-medium text-white shadow-glow-sm transition-shadow hover:shadow-glow-brand"
        >
          <Plus className="h-4 w-4" />
          New video
        </Link>
      </motion.div>

      {isPending ? (
        <CardGridSkeleton />
      ) : isError ? (
        <p className="text-content-secondary">Couldn&apos;t load your videos.</p>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No videos yet"
          description="Generate with AI or upload your own."
          action={
            <Link
              to="/create"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-brand px-4 text-sm font-medium text-white shadow-glow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add a video
            </Link>
          }
        />
      ) : (
        <>
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {data.items.map((video) => (
              <motion.div key={video.id} variants={cardItem}>
                <VideoCard video={video} />
              </motion.div>
            ))}
          </motion.div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-content-muted">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
