import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import { Metrics } from '../domain/metrics';
import type { IMetricsProvider, MetricsQuery } from '../domain/ports/metrics-provider';

const GRAPH_BASE = 'https://graph.instagram.com';
/** Reel insights available on the media node; `views` supersedes plays/impressions. */
const METRICS = ['views', 'likes', 'comments', 'shares'] as const;

interface InstagramApiError {
  error?: { message?: string };
}

interface InsightsResponse extends InstagramApiError {
  data?: {
    name?: string;
    values?: { value?: number }[];
    total_value?: { value?: number };
  }[];
}

/**
 * Reads Reel insights from the Instagram platform API's media `insights` edge.
 *
 * Requires the manage-insights scope on the connection — a connection authorized
 * before that scope was requested returns a permissions error here, which the
 * sync isolates per post so one stale connection can't fail the whole refresh.
 */
export class InstagramMetricsProvider implements IMetricsProvider {
  async fetch(params: MetricsQuery): Promise<Metrics> {
    const url = `${GRAPH_BASE}/${encodeURIComponent(params.externalPostId)}/insights?metric=${METRICS.join(',')}`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    const json = (await res.json().catch(() => ({}))) as InsightsResponse;
    if (!res.ok) {
      throw new Error(
        `Instagram metrics lookup failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }

    return Metrics.of({
      views: readMetric(json, 'views'),
      likes: readMetric(json, 'likes'),
      comments: readMetric(json, 'comments'),
      shares: readMetric(json, 'shares'),
    });
  }
}

/**
 * Pulls one named metric out of the insights payload. Instagram returns either
 * a `values` array or a `total_value` depending on the metric and API version;
 * a metric the account isn't eligible for is simply absent → 0.
 */
function readMetric(json: InsightsResponse, name: string): number {
  const entry = json.data?.find((item) => item.name === name);
  const value = entry?.total_value?.value ?? entry?.values?.[0]?.value;
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : 0;
}
