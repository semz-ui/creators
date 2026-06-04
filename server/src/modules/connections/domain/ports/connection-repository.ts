import type { Connection } from '../connection.entity';
import type { Platform } from '../platform';

/** Persistence port for the Connection aggregate. */
export interface IConnectionRepository {
  save(connection: Connection): Promise<void>;
  findById(id: string): Promise<Connection | null>;
  findByUserAndPlatform(userId: string, platform: Platform): Promise<Connection | null>;
  listByUser(userId: string): Promise<Connection[]>;
  delete(id: string): Promise<void>;
}
