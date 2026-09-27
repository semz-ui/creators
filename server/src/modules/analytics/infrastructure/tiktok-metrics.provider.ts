import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import { Metrics } from '../domain/metrics';
import type { IMetricsProvider, MetricsQuery } from '../domain/ports/metrics-provider';

const QUERY_URL =
  'https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count';

/** TikTok wraps every Display API response in { data, error }. */
interface TikTokEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string };
}

interface QueryData {
  videos?: {
    view_count?: number;
    like_count?: number;
    comment_count?: number;
    share_count?: number;
  }[];
}

/**
 * Reads engagement counts from the TikTok Display API's video query, which
 * requires the `video.list` scope on the connection.
 *
 * The id passed here must be a real post id. Publications created before the
 * publisher started capturing `publicaly_available_post_id` stored the upload
 * session's `publish_id` instead, which this endpoint does not accept — those
 * rows fail per-post and are skipped by the sync.
 */
export class TikTokMetricsProvider implements IMetricsProvider {
  async fetch(params: MetricsQuery): Promise<Metrics> {
    const res = await fetchWithTimeout(QUERY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ filters: { video_ids: [params.externalPostId] } }),
    });
    const json = (await res.json().catch(() => ({}))) as TikTokEnvelope<QueryData>;
    // TikTok answers 200 with an error code in the envelope for some failures.
    if (!res.ok || (json.error?.code && json.error.code !== 'ok')) {
      throw new Error(
        `TikTok metrics lookup failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }

    // An unknown or deleted id yields an empty list rather than an error.
    const video = json.data?.videos?.[0];
    if (!video) {
      throw new Error(`TikTok returned no video for id ${params.externalPostId}`);
    }

    return Metrics.of({
      views: parseCount(video.view_count),
      likes: parseCount(video.like_count),
      comments: parseCount(video.comment_count),
      shares: parseCount(video.share_count),
    });
  }
}

/** Counts are omitted when the field is unavailable for the video → 0. */
function parseCount(value: number | undefined): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : 0;
}
