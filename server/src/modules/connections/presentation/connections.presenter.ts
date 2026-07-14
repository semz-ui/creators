import type { PublicConnection } from '../application/dto';

import type {
  ConnectionListResponse,
  ConnectionResponse,
  StartConnectionResponse,
} from './connections.dto';

/**
 * Maps the connections application DTOs to the presentation DTOs sent on the
 * wire. Every field is enumerated here, so the presentation layer owns its
 * contract. Tokens must never appear in any of these shapes.
 */

export function presentConnection(connection: PublicConnection): ConnectionResponse {
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

export function presentConnectionList(connections: PublicConnection[]): ConnectionListResponse {
  return {
    items: connections.map(presentConnection),
  };
}

export function presentStart(result: { authorizationUrl: string }): StartConnectionResponse {
  return {
    authorizationUrl: result.authorizationUrl,
  };
}
