import type { Platform } from '@modules/connections/domain/platform';

import type { DistributionStatus } from '../domain/distribution';
import type { Publication, PublicationStatus } from '../domain/publication.entity';

export interface PublicDistribution {
  platform: Platform;
  status: DistributionStatus;
  externalPostId: string | null;
  error: string | null;
}

export interface PublicPublication {
  id: string;
  videoId: string;
  caption: string | null;
  status: PublicationStatus;
  scheduledAt: Date | null;
  targets: PublicDistribution[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePublicationInput {
  videoId: string;
  platforms: Platform[];
  caption?: string;
  scheduledAt?: string;
}

export interface ListPublicationsInput {
  page: number;
  limit: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function toPublicPublication(publication: Publication): PublicPublication {
  const s = publication.toSnapshot();
  return {
    id: s.id,
    videoId: s.videoId,
    caption: s.caption,
    status: s.status,
    scheduledAt: s.scheduledAt,
    targets: s.targets.map((t) => ({
      platform: t.platform,
      status: t.status,
      externalPostId: t.externalPostId,
      error: t.error,
    })),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
