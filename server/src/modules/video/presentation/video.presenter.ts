import type { PagedResult, PublicVideo } from '../application/dto';

import type { VideoPageResponse, VideoResponse } from './video.dto';

/**
 * Maps the video application DTOs to the presentation DTOs sent on the wire.
 * Every field is enumerated here, so the presentation layer owns its contract.
 */

export function presentVideo(video: PublicVideo): VideoResponse {
  return {
    id: video.id,
    source: video.source,
    title: video.title,
    prompt: video.prompt,
    durationSeconds: video.durationSeconds,
    status: video.status,
    resultUrl: video.resultUrl,
    error: video.error,
    musicTrackId: video.musicTrackId,
    narrationText: video.narrationText,
    narrationVoice: video.narrationVoice,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

export function presentVideoPage(page: PagedResult<PublicVideo>): VideoPageResponse {
  return {
    items: page.items.map(presentVideo),
    page: page.page,
    limit: page.limit,
    total: page.total,
  };
}
