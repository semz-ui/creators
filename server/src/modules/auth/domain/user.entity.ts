import { randomUUID } from 'node:crypto';

import type { Email } from './value-objects/email';

/** Plain, persistence-friendly representation of a User. */
export interface UserSnapshot {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User aggregate. Persistence-agnostic: ids are generated in the domain (UUID)
 * so the entity never depends on the database. Construct via {@link register}
 * for new users or {@link fromSnapshot} when rehydrating from storage.
 */
export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /** Create a brand-new user from a validated email and an already-hashed password. */
  static register(email: Email, passwordHash: string): User {
    const now = new Date();
    return new User(randomUUID(), email.value, passwordHash, now, now);
  }

  /** Rehydrate from persisted state. */
  static fromSnapshot(snapshot: UserSnapshot): User {
    return new User(
      snapshot.id,
      snapshot.email,
      snapshot.passwordHash,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /** Projection safe to return over the wire (never includes the password hash). */
  toPublic(): { id: string; email: string } {
    return { id: this.id, email: this.email };
  }
}
