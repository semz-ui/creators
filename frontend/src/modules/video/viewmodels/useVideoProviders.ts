import { useQuery } from '@tanstack/react-query';

import { videoApi } from '../data/video.api';
import { videoKeys } from '../data/query-keys';

/**
 * Which video generators the server can use. This reflects deploy-time
 * configuration, not per-user state, so it's cached aggressively — it can only
 * change when the server restarts with different credentials.
 */
export function useVideoProviders() {
  return useQuery({
    queryKey: videoKeys.providers,
    queryFn: videoApi.providers,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.providers,
  });
}
