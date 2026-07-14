import type { PagedResult, PublicDistribution, PublicPublication } from '../application/dto';

import type {
  DistributionResponse,
  PublicationPageResponse,
  PublicationResponse,
  RunDueResponse,
} from './publishing.dto';

/**
 * Maps the publishing application DTOs to the presentation DTOs sent on the
 * wire. Every field is enumerated here, so the presentation layer owns its
 * contract.
 */

export function presentDistribution(target: PublicDistribution): DistributionResponse {
  return {
    platform: target.platform,
    status: target.status,
    externalPostId: target.externalPostId,
    error: target.error,
  };
}

export function presentPublication(publication: PublicPublication): PublicationResponse {
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

export function presentPublicationPage(
  page: PagedResult<PublicPublication>,
): PublicationPageResponse {
  return {
    items: page.items.map(presentPublication),
    page: page.page,
    limit: page.limit,
    total: page.total,
  };
}

export function presentRunDue(result: { processed: number }): RunDueResponse {
  return {
    processed: result.processed,
  };
}
