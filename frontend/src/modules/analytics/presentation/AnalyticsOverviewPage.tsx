import type { Platform } from '@/modules/connections/data/connections.types';
import { PLATFORMS } from '@/modules/connections/viewmodels/platform.constants';
import { formatNumber } from '@/shared/lib/format';
import { Button, Card, Spinner } from '@/shared/ui';

import { useOverview } from '../viewmodels/useOverview';
import { useRefreshAnalytics } from '../viewmodels/useRefreshAnalytics';
import { MetricsGrid } from './MetricsGrid';

const LABEL: Record<Platform, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.label]),
) as Record<Platform, string>;

export function AnalyticsOverviewPage() {
  const { data: overview, isPending, isError } = useOverview();
  const { refresh, isRefreshing } = useRefreshAnalytics();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-content">Analytics</h1>
          <p className="mt-1 text-content-secondary">Engagement across your published videos.</p>
        </div>
        <Button variant="secondary" disabled={isRefreshing} onClick={refresh}>
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="text-content-secondary">Couldn&apos;t load analytics.</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-sm font-medium text-content-secondary">Totals</p>
              <p className="text-sm text-content-muted">
                {formatNumber(overview.videoCount)} video{overview.videoCount === 1 ? '' : 's'}
              </p>
            </div>
            <MetricsGrid metrics={overview.totals} />
          </Card>

          {overview.byPlatform.length > 0 && (
            <Card>
              <p className="mb-3 text-sm font-medium text-content-secondary">By platform</p>
              <div className="space-y-5">
                {overview.byPlatform.map((row) => (
                  <div key={row.platform}>
                    <p className="mb-2 font-medium text-content">{LABEL[row.platform]}</p>
                    <MetricsGrid metrics={row.metrics} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
