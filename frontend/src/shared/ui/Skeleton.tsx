import { cn } from '@/shared/lib/cn';

/** Animated placeholder block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-sunken', className)} />;
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
