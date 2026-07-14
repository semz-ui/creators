import type { ConnectionStatus } from '../domain/connection.entity';
import type { Platform } from '../domain/platform';

/**
 * Presentation-layer DTOs for the connections module: the exact JSON shapes
 * this API puts on the wire. Owned by the presentation layer and deliberately
 * separate from the application DTOs (`application/dto.ts`) — the presenter
 * maps one to the other. Tokens must never appear in any of these shapes.
 */

export interface ConnectionResponse {
  id: string;
  platform: Platform;
  displayName: string;
  externalAccountId: string;
  status: ConnectionStatus;
  scopes: string[];
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionListResponse {
  items: ConnectionResponse[];
}

export interface StartConnectionResponse {
  authorizationUrl: string;
}
