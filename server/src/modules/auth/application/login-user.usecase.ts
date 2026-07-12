import { InvalidCredentialsError } from '../domain/auth.errors';
import type { IPasswordHasher } from '../domain/ports/password-hasher';
import type { IUserRepository } from '../domain/ports/user-repository';
import { Email } from '../domain/value-objects/email';
import type { AuthResult, LoginInput } from './dto';
import type { SessionService } from './session.service';

/** Authenticates an existing user and starts a new session. */
export class LoginUser {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  async execute(input: LoginInput): Promise<AuthResult> {
    // Email.create can throw on malformed input; treat that as bad credentials
    // rather than a validation error to avoid leaking which field was wrong.
    let email: Email;
    try {
      email = Email.create(input.email);
    } catch {
      throw new InvalidCredentialsError();
    }

    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Google-only accounts have no password; indistinguishable from a wrong
    // password to avoid leaking how the account was created.
    if (user.passwordHash === null) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.hasher.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const tokens = await this.sessions.issue(user.id);
    return { user: user.toPublic(), ...tokens };
  }
}
