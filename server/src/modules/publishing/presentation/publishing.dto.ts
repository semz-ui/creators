import type { Platform } from '@modules/connections/domain/platform';

import type { DistributionStatus } from '../domain/distribution';
import type { PublicationStatus } from '../domain/publication.entity';

/**
 * Presentation-layer DTOs for the publishing module: the exact JSON shapes this
 * API puts on the wire. Owned by the presentation layer and deliberately
 * separate from the application DTOs (`application/dto.ts`) — the presenter
 * maps one to the other so neither layer's contract drifts into the other.
 */

export interface DistributionResponse {
  platform: Platform;
  status: DistributionStatus;
  externalPostId: string | null;
  error: string | null;
}

export interface PublicationResponse {
  id: string;
  videoId: string;
  caption: string | null;
  status: PublicationStatus;
  scheduledAt: Date | null;
  targets: DistributionResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicationPageResponse {
  items: PublicationResponse[];
  page: number;
  limit: number;
  total: number;
}

export interface RunDueResponse {
  processed: number;
}
