import bcrypt from 'bcryptjs';

import type { IPasswordHasher } from '../domain/ports/password-hasher';

const SALT_ROUNDS = 12;

/** bcrypt implementation of {@link IPasswordHasher}. */
export class BcryptHasher implements IPasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
