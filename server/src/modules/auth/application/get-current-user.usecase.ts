import { NotFoundError } from '@shared/domain/errors';

import type { IUserRepository } from '../domain/ports/user-repository';
import type { PublicUser } from './dto';

/** Loads the public profile of the authenticated user. */
export class GetCurrentUser {
  constructor(private readonly users: IUserRepository) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toPublic();
  }
}
