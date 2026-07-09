import { motion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';

/** Shimmer placeholder block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('relative overflow-hidden rounded-lg bg-surface-raised', className)}
    >
      <motion.div
        className="absolute inset-0 bg-shimmer"
        style={{ backgroundSize: '800px 100%' }}
        animate={{ backgroundPosition: ['-400px 0', '400px 0'] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
      />
    </div>
  );
}

/** A grid of card-shaped skeletons (matches the video/library layout). */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}
