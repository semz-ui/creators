import type { PublicConnection } from '../application/dto';

/**
 * Wire shapes for the connections module: every field this API returns is
 * enumerated here, so the presentation layer — not the use-case DTO — owns
 * the contract. Tokens must never appear in any of these shapes.
 */

export function presentConnection(connection: PublicConnection) {
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

export function presentConnectionList(connections: PublicConnection[]) {
  return {
    items: connections.map(presentConnection),
  };
}

export function presentStart(result: { authorizationUrl: string }) {
  return {
    authorizationUrl: result.authorizationUrl,
  };
}
