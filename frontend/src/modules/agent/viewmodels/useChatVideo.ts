import { useQuery } from '@tanstack/react-query';

import { videoKeys } from '@/modules/video/data/query-keys';
import { videoApi } from '@/modules/video/data/video.api';
import type { VideoStatus } from '@/modules/video/data/video.types';

import type { ChatVideo } from './parse-tool-result';

const POLL_INTERVAL_MS = 2500;

const isGenerating = (status: VideoStatus | undefined): boolean =>
  status === 'queued' || status === 'processing';

/**
 * The freshest view of a video the agent surfaced.
 *
 * A transcript records what was true when the tool ran, so a video that was
 * still generating then would otherwise read as "generating" forever. Only
 * those are tracked: a video the tool already saw finish renders from the
 * transcript alone, so reopening an old conversation costs no requests.
 *
 * The query key is the video module's, so the detail page opens warm and a
 * video watched here doesn't get fetched twice.
 */
export function useChatVideo(seed: ChatVideo): ChatVideo {
  const shouldTrack = isGenerating(seed.status);

  const { data } = useQuery({
    queryKey: videoKeys.detail(seed.id),
    queryFn: () => videoApi.get(seed.id),
    enabled: shouldTrack,
    // Poll until generation reaches a terminal state, then stop.
    refetchInterval: (query) => (isGenerating(query.state.data?.status) ? POLL_INTERVAL_MS : false),
  });

  if (!shouldTrack || !data) return seed;

  return {
    id: data.id,
    status: data.status,
    prompt: data.title ?? data.prompt,
    durationSeconds: data.durationSeconds,
    resultUrl: data.resultUrl,
    error: data.error,
  };
}
