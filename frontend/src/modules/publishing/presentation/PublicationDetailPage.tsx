import { Link, useParams } from 'react-router-dom';

import type { Platform } from '@/modules/connections/data/connections.types';
import { PLATFORMS } from '@/modules/connections/viewmodels/platform.constants';
import { formatDateTime } from '@/shared/lib/format';
import { Card, Spinner } from '@/shared/ui';

import { usePublication } from '../viewmodels/usePublication';
import { PublicationStatusBadge, TargetStatusBadge } from './PublicationStatusBadge';

const LABEL: Record<Platform, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.label]),
) as Record<Platform, string>;

export function PublicationDetailPage() {
  const { id = '' } = useParams();
  const { data: publication, isPending, isError } = usePublication(id);

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !publication) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-content-secondary">We couldn&apos;t load that publication.</p>
        <Link to="/publications" className="mt-2 inline-block text-sm text-brand hover:underline">
          ← Back to publications
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/publications" className="text-sm text-brand hover:underline">
          ← Publications
        </Link>
        <PublicationStatusBadge status={publication.status} />
      </div>

      <Card className="space-y-4">
        {publication.caption && <p className="text-content">{publication.caption}</p>}
        {publication.scheduledAt && (
          <p className="text-sm text-content-muted">
            Scheduled for {formatDateTime(publication.scheduledAt)}
          </p>
        )}

        <ul className="divide-y divide-line-subtle">
          {publication.targets.map((target) => (
            <li key={target.platform} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-content">{LABEL[target.platform]}</p>
                {target.error && <p className="text-sm text-danger">{target.error}</p>}
              </div>
              <TargetStatusBadge status={target.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
