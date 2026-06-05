import { Link } from 'react-router-dom';

import { Card, Spinner } from '@/shared/ui';

import { usePublications } from '../viewmodels/usePublications';
import { PublicationStatusBadge } from './PublicationStatusBadge';

export function PublicationsPage() {
  const { data, isPending, isError } = usePublications();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-content">Publications</h1>
      <p className="mt-1 text-content-secondary">Where your videos have been shared.</p>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="mt-6 text-content-secondary">Couldn&apos;t load your publications.</p>
      ) : data.items.length === 0 ? (
        <Card className="mt-6 text-center">
          <p className="text-content-secondary">Nothing published yet.</p>
          <Link to="/library" className="mt-2 inline-block text-sm text-brand hover:underline">
            Pick a video to publish →
          </Link>
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {data.items.map((publication) => (
            <li key={publication.id}>
              <Link to={`/publications/${publication.id}`} className="block">
                <Card className="flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-md">
                  <div className="min-w-0">
                    <p className="truncate text-content">{publication.caption ?? 'Untitled'}</p>
                    <p className="text-xs text-content-muted">
                      {publication.targets.map((t) => t.platform).join(', ')}
                    </p>
                  </div>
                  <PublicationStatusBadge status={publication.status} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
