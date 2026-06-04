import { Schema, model } from 'mongoose';

import type { ConnectionStatus } from '../domain/connection.entity';
import type { Platform } from '../domain/platform';

export interface ConnectionDocument {
  _id: string;
  userId: string;
  platform: Platform;
  externalAccountId: string;
  displayName: string;
  scopes: string[];
  status: ConnectionStatus;
  /** Encrypted at rest. */
  accessToken: string;
  /** Encrypted at rest; null when the provider issues no refresh token. */
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new Schema<ConnectionDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    platform: { type: String, required: true },
    externalAccountId: { type: String, required: true },
    displayName: { type: String, required: true },
    scopes: { type: [String], default: [] },
    status: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// One connection per platform per user.
connectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

export const ConnectionModel = model<ConnectionDocument>('Connection', connectionSchema);
