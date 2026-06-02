import { EmailAlreadyInUseError } from '../domain/auth.errors';
import type { IPasswordHasher } from '../domain/ports/password-hasher';
import type { IUserRepository } from '../domain/ports/user-repository';
import { User } from '../domain/user.entity';
import { Email } from '../domain/value-objects/email';
import { Password } from '../domain/value-objects/password';
import type { AuthResult, RegisterInput } from './dto';
import type { SessionService } from './session.service';

/** Registers a new user and returns an authenticated session (auto-login). */
export class RegisterUser {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  async execute(input: RegisterInput): Promise<AuthResult> {
    const email = Email.create(input.email);
    const password = Password.create(input.password);

    if (await this.users.existsByEmail(email)) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.hasher.hash(password.value);
    const user = User.register(email, passwordHash);
    await this.users.save(user);

    const tokens = await this.sessions.issue(user.id);
    return { user: user.toPublic(), ...tokens };
  }
}
