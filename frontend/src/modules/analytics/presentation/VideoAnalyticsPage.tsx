import { Link, useParams } from 'react-router-dom';

import { PLATFORMS, type Platform } from '@/modules/connections/data/connections.types';
import { formatDateTime } from '@/shared/lib/format';
import { Card, Spinner } from '@/shared/ui';

import { useVideoAnalytics } from '../viewmodels/useVideoAnalytics';
import { MetricsGrid } from './MetricsGrid';

const LABEL: Record<Platform, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.label]),
) as Record<Platform, string>;

export function VideoAnalyticsPage() {
  const { id = '' } = useParams();
  const { data, isPending, isError } = useVideoAnalytics(id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/videos/${id}`} className="text-sm text-brand hover:underline">
        ← Back to the video
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold text-content">Video analytics</h1>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError || !data ? (
        <p className="mt-6 text-content-secondary">Couldn&apos;t load analytics.</p>
      ) : data.byPlatform.length === 0 ? (
        <Card className="mt-6 text-center">
          <p className="text-content-secondary">
            No analytics yet — publish this video and refresh to see metrics.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          <Card>
            <p className="mb-3 text-sm font-medium text-content-secondary">Totals</p>
            <MetricsGrid metrics={data.totals} />
          </Card>
          {data.byPlatform.map((row) => (
            <Card key={row.platform}>
              <div className="mb-3 flex items-baseline justify-between">
                <p className="font-medium text-content">{LABEL[row.platform]}</p>
                <p className="text-xs text-content-muted">Updated {formatDateTime(row.syncedAt)}</p>
              </div>
              <MetricsGrid metrics={row.metrics} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
