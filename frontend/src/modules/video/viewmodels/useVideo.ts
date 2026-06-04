import { useQuery } from '@tanstack/react-query';

import { videoApi } from '../data/video.api';
import { videoKeys } from '../data/query-keys';
import { isVideoProcessing } from '../data/video.types';

const POLL_INTERVAL_MS = 2500;

/** A single video; polls while it is still generating. */
export function useVideo(id: string) {
  return useQuery({
    queryKey: videoKeys.detail(id),
    queryFn: () => videoApi.get(id),
    // Poll until generation reaches a terminal state.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isVideoProcessing(status) ? POLL_INTERVAL_MS : false;
    },
  });
}
