import type { Connection, Platform } from '../data/connections.types';
import { PLATFORMS } from './platform.constants';
import { useConnections } from './useConnections';

export interface PlatformRow {
  id: Platform;
  label: string;
  /** The user's active connection for this platform, or null when unconnected. */
  connection: Connection | null;
}

/**
 * The full platform catalog, each row carrying the user's active connection to
 * it if there is one — every platform is listed whether connected or not.
 */
export function usePlatformRows() {
  const { data: connections, isPending, isError } = useConnections();

  const byPlatform = new Map<Platform, Connection>();
  for (const connection of connections ?? []) {
    if (connection.status === 'active') byPlatform.set(connection.platform, connection);
  }

  const rows: PlatformRow[] = PLATFORMS.map(({ id, label }) => ({
    id,
    label,
    connection: byPlatform.get(id) ?? null,
  }));

  return { rows, isPending, isError };
}
