import { InvalidTokenError } from '../domain/auth.errors';
import type { IPasswordHasher } from '../domain/ports/password-hasher';
import type { IPasswordResetTokenStore } from '../domain/ports/password-reset-token-store';
import type { IRefreshTokenStore } from '../domain/ports/refresh-token-store';
import type { IUserRepository } from '../domain/ports/user-repository';
import { Password } from '../domain/value-objects/password';
import type { ResetPasswordInput } from './dto';

/** Redeems a reset token, sets the new password, and logs out every session. */
export class ResetPassword {
  constructor(
    private readonly resetTokens: IPasswordResetTokenStore,
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly refreshTokens: IRefreshTokenStore,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    // Validate the password first — a policy failure must not burn the token.
    const password = Password.create(input.password);

    const userId = await this.resetTokens.consume(input.token);
    if (userId === null) {
      throw new InvalidTokenError('Invalid or expired reset token');
    }

    const user = await this.users.findById(userId);
    if (user === null) {
      throw new InvalidTokenError('Invalid or expired reset token');
    }

    const passwordHash = await this.hasher.hash(password.value);
    await this.users.save(user.withNewPassword(passwordHash));

    // The password changed: every existing session is now suspect.
    await this.refreshTokens.revokeUser(userId);
  }
}
