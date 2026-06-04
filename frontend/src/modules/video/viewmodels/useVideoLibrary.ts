import { useQuery } from '@tanstack/react-query';

import { videoApi } from '../data/video.api';
import { videoKeys } from '../data/query-keys';

/** Paged list of the user's videos. */
export function useVideoLibrary(page = 1, limit = 12) {
  return useQuery({
    queryKey: videoKeys.list(page, limit),
    queryFn: () => videoApi.list({ page, limit }),
  });
}
