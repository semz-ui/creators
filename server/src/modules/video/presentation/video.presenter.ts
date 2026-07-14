import type { PagedResult, PublicVideo } from '../application/dto';

/**
 * Wire shapes for the video module: every field this API returns is enumerated
 * here, so the presentation layer — not the use-case DTO — owns the contract.
 */

export function presentVideo(video: PublicVideo) {
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

export function presentVideoPage(page: PagedResult<PublicVideo>) {
  return {
    items: page.items.map(presentVideo),
    page: page.page,
    limit: page.limit,
    total: page.total,
  };
}
