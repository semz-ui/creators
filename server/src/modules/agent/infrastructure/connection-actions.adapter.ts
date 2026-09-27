import type { ListConnections } from '@modules/connections/application/list-connections.usecase';

import type { AgentConnection, IConnectionActions } from '../domain/ports/connection-actions';

export class ConnectionActionsAdapter implements IConnectionActions {
  constructor(private readonly listConnections: ListConnections) {}

  async list(userId: string): Promise<AgentConnection[]> {
    const connections = await this.listConnections.execute(userId);
    return connections.map((connection) => ({
      platform: connection.platform,
      displayName: connection.displayName,
      status: connection.status,
    }));
  }
}
