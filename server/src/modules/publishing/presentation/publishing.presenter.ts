import type { PagedResult, PublicDistribution, PublicPublication } from '../application/dto';

/**
 * Wire shapes for the publishing module: every field this API returns is
 * enumerated here, so the presentation layer — not the use-case DTO — owns
 * the contract.
 */

export function presentDistribution(target: PublicDistribution) {
  return {
    platform: target.platform,
    status: target.status,
    externalPostId: target.externalPostId,
    error: target.error,
  };
}

export function presentPublication(publication: PublicPublication) {
  return {
    id: publication.id,
    videoId: publication.videoId,
    caption: publication.caption,
    status: publication.status,
    scheduledAt: publication.scheduledAt,
    targets: publication.targets.map(presentDistribution),
    createdAt: publication.createdAt,
    updatedAt: publication.updatedAt,
  };
}

export function presentPublicationPage(page: PagedResult<PublicPublication>) {
  return {
    items: page.items.map(presentPublication),
    page: page.page,
    limit: page.limit,
    total: page.total,
  };
}

export function presentRunDue(result: { processed: number }) {
  return {
    processed: result.processed,
  };
}
