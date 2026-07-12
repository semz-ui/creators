import type { Email } from '../value-objects/email';
import type { User } from '../user.entity';

/** Persistence port for the User aggregate. Implemented in the infrastructure layer. */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  save(user: User): Promise<void>;
}
