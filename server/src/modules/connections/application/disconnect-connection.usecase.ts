import { ConnectionNotFoundError } from '../domain/connection.errors';
import type { IConnectionRepository } from '../domain/ports/connection-repository';

/** Removes one of the user's connections. 404s if missing or not theirs. */
export class DisconnectConnection {
  constructor(private readonly connections: IConnectionRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    const connection = await this.connections.findById(id);
    if (!connection || connection.userId !== userId) {
      throw new ConnectionNotFoundError();
    }
    await this.connections.delete(id);
  }
}
