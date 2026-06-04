import { Schema, model } from 'mongoose';

import type { Platform } from '@modules/connections/domain/platform';

import type { DistributionStatus } from '../domain/distribution';
import type { PublicationStatus } from '../domain/publication.entity';

export interface DistributionSubdoc {
  platform: Platform;
  connectionId: string;
  status: DistributionStatus;
  externalPostId: string | null;
  error: string | null;
}

export interface PublicationDocument {
  _id: string;
  userId: string;
  videoId: string;
  caption: string | null;
  scheduledAt: Date | null;
  status: PublicationStatus;
  targets: DistributionSubdoc[];
  createdAt: Date;
  updatedAt: Date;
}

const distributionSchema = new Schema<DistributionSubdoc>(
  {
    platform: { type: String, required: true },
    connectionId: { type: String, required: true },
    status: { type: String, required: true },
    externalPostId: { type: String, default: null },
    error: { type: String, default: null },
  },
  { _id: false },
);

const publicationSchema = new Schema<PublicationDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    videoId: { type: String, required: true },
    caption: { type: String, default: null },
    scheduledAt: { type: Date, default: null },
    status: { type: String, required: true },
    targets: { type: [distributionSchema], default: [] },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

publicationSchema.index({ userId: 1, createdAt: -1 });
// Find due scheduled publications efficiently.
publicationSchema.index({ status: 1, scheduledAt: 1 });

export const PublicationModel = model<PublicationDocument>('Publication', publicationSchema);
