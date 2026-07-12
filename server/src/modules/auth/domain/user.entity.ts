import { randomUUID } from 'node:crypto';

import type { Email } from './value-objects/email';

/** Plain, persistence-friendly representation of a User. */
export interface UserSnapshot {
  id: string;
  email: string;
  /** Null for Google-only accounts that never set a password. */
  passwordHash: string | null;
  /** Google `sub` claim when the account is linked to Google, else null. */
  googleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User aggregate. Persistence-agnostic: ids are generated in the domain (UUID)
 * so the entity never depends on the database. Construct via {@link register}
 * / {@link registerWithGoogle} for new users or {@link fromSnapshot} when
 * rehydrating from storage.
 */
export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string | null,
    public readonly googleId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /** Create a brand-new user from a validated email and an already-hashed password. */
  static register(email: Email, passwordHash: string): User {
    const now = new Date();
    return new User(randomUUID(), email.value, passwordHash, null, now, now);
  }

  /** Create a brand-new password-less user from a verified Google identity. */
  static registerWithGoogle(email: Email, googleId: string): User {
    const now = new Date();
    return new User(randomUUID(), email.value, null, googleId, now, now);
  }

  /** Rehydrate from persisted state. */
  static fromSnapshot(snapshot: UserSnapshot): User {
    return new User(
      snapshot.id,
      snapshot.email,
      snapshot.passwordHash,
      snapshot.googleId,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  /** Copy of this user with a replaced (already-hashed) password. */
  withNewPassword(passwordHash: string): User {
    return new User(this.id, this.email, passwordHash, this.googleId, this.createdAt, new Date());
  }

  /** Copy of this user linked to a Google identity. */
  withGoogleId(googleId: string): User {
    return new User(this.id, this.email, this.passwordHash, googleId, this.createdAt, new Date());
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      googleId: this.googleId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /** Projection safe to return over the wire (never includes the password hash). */
  toPublic(): { id: string; email: string } {
    return { id: this.id, email: this.email };
  }
}
