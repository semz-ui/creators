import type { IConnectionRepository } from '../domain/ports/connection-repository';
import { toPublicConnection, type PublicConnection } from './dto';

/** Lists the user's linked accounts (without tokens). */
export class ListConnections {
  constructor(private readonly connections: IConnectionRepository) {}

  async execute(userId: string): Promise<PublicConnection[]> {
    const connections = await this.connections.listByUser(userId);
    return connections.map(toPublicConnection);
  }
}
