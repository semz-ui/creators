import { Link } from 'react-router-dom';

import { useSession } from '@/modules/auth/viewmodels/useSession';
import { Card, Spinner } from '@/shared/ui';

import { useVideoLibrary } from '../viewmodels/useVideoLibrary';
import { VideoCard } from './VideoCard';

export function DashboardPage() {
  const { user } = useSession();
  const { data, isPending } = useVideoLibrary(1, 6);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-content">
            Welcome{user?.email ? `, ${user.email}` : ''}
          </h1>
          <p className="mt-1 text-content-secondary">Turn a prompt into a video.</p>
        </div>
        <Link
          to="/create"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 font-medium text-content-inverse hover:bg-brand-hover"
        >
          Create video
        </Link>
      </div>

      <h2 className="mb-3 font-display text-lg font-medium text-content">Recent</h2>
      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card className="text-center">
          <p className="text-content-secondary">No videos yet — create your first one.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
