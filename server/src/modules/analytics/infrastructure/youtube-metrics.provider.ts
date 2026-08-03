import { fetchWithTimeout } from '@shared/infrastructure/http/fetch-with-timeout';

import { Metrics } from '../domain/metrics';
import type { IMetricsProvider, MetricsQuery } from '../domain/ports/metrics-provider';

const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

interface YouTubeApiError {
  error?: { message?: string };
}

interface VideosResponse extends YouTubeApiError {
  items?: {
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }[];
}

/**
 * Reads engagement counts from the YouTube Data API's `videos.list`, which the
 * existing `youtube.readonly` connection scope already covers.
 *
 * Note on shares: the Data API's statistics resource has no share count, so
 * shares are reported as 0. The real number lives in the YouTube Analytics API
 * (`yt-analytics.readonly`), which the connection does not request.
 *
 * Counts come back as strings and are omitted entirely when the uploader hides
 * them (likes) or disables the feature (comments) — both map to 0 rather than
 * failing the sync.
 */
export class YouTubeMetricsProvider implements IMetricsProvider {
  async fetch(params: MetricsQuery): Promise<Metrics> {
    const url = `${VIDEOS_URL}?part=statistics&id=${encodeURIComponent(params.externalPostId)}`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    const json = (await res.json().catch(() => ({}))) as VideosResponse;
    if (!res.ok) {
      throw new Error(
        `YouTube metrics lookup failed (HTTP ${res.status}): ${json.error?.message ?? res.statusText}`,
      );
    }

    // An empty `items` means the video is deleted, private, or not ours.
    const statistics = json.items?.[0]?.statistics;
    if (!statistics) {
      throw new Error(`YouTube returned no video for id ${params.externalPostId}`);
    }

    return Metrics.of({
      views: parseCount(statistics.viewCount),
      likes: parseCount(statistics.likeCount),
      comments: parseCount(statistics.commentCount),
      shares: 0,
    });
  }
}

/** YouTube sends counts as strings; absent/unparseable means "hidden" → 0. */
function parseCount(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
