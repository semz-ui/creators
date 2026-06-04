import type { Connection } from '../domain/connection.entity';
import type { ConnectionStatus } from '../domain/connection.entity';
import type { Platform } from '../domain/platform';

/** Connection fields safe to expose — never includes tokens. */
export interface PublicConnection {
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

export interface CompleteConnectionInput {
  state: string;
  code: string;
}

export function toPublicConnection(connection: Connection): PublicConnection {
  return {
    id: connection.id,
    platform: connection.platform,
    displayName: connection.displayName,
    externalAccountId: connection.externalAccountId,
    status: connection.status,
    scopes: connection.scopes,
    expiresAt: connection.expiresAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}
