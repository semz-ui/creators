import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../data/analytics.api';
import { analyticsKeys } from '../data/query-keys';

/** Per-video analytics (per-platform metrics + totals). */
export function useVideoAnalytics(videoId: string) {
  return useQuery({
    queryKey: analyticsKeys.video(videoId),
    queryFn: () => analyticsApi.getVideoAnalytics(videoId),
  });
}
