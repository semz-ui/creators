import { useQuery } from '@tanstack/react-query';

import { videoApi } from '../data/video.api';
import { videoKeys } from '../data/query-keys';
import { isVideoProcessing, type VideoStatus } from '../data/video.types';

const POLL_INTERVAL_MS = 2500;

/** Poll while generation is in flight; stop on a terminal state. */
export function videoPollInterval(status: VideoStatus | undefined): number | false {
  return status && isVideoProcessing(status) ? POLL_INTERVAL_MS : false;
}

/** A single video; polls while it is still generating. */
export function useVideo(id: string) {
  return useQuery({
    queryKey: videoKeys.detail(id),
    queryFn: () => videoApi.get(id),
    refetchInterval: (query) => videoPollInterval(query.state.data?.status),
  });
}
