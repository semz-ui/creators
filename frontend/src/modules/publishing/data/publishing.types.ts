import type { Platform } from '@/modules/connections/data/connections.types';

export type PublicationStatus =
  | 'scheduled'
  | 'publishing'
  | 'completed'
  | 'partially_failed'
  | 'failed';

export type DistributionStatus = 'pending' | 'published' | 'failed';

export interface DistributionTarget {
  platform: Platform;
  status: DistributionStatus;
  externalPostId: string | null;
  error: string | null;
}

export interface Publication {
  id: string;
  videoId: string;
  caption: string | null;
  status: PublicationStatus;
  scheduledAt: string | null;
  targets: DistributionTarget[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublicationInput {
  videoId: string;
  platforms: Platform[];
  caption?: string;
  scheduledAt?: string;
}

export interface PublicationPage {
  items: Publication[];
  page: number;
  limit: number;
  total: number;
}
