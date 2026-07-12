import { GoogleEmailNotVerifiedError } from '../domain/auth.errors';
import type { IGoogleIdentityVerifier } from '../domain/ports/google-identity-verifier';
import type { IUserRepository } from '../domain/ports/user-repository';
import { User } from '../domain/user.entity';
import { Email } from '../domain/value-objects/email';
import type { AuthResult, GoogleSignInInput } from './dto';
import type { SessionService } from './session.service';

/**
 * Signs a user in from a verified Google ID token: finds the linked account,
 * auto-links an existing account with the same (verified) email, or creates a
 * new password-less user. Always ends in a fresh session.
 */
export class SignInWithGoogle {
  constructor(
    private readonly verifier: IGoogleIdentityVerifier,
    private readonly users: IUserRepository,
    private readonly sessions: SessionService,
  ) {}

  async execute(input: GoogleSignInInput): Promise<AuthResult> {
    const identity = await this.verifier.verify(input.idToken);
    // An unverified email must not create or link an account — either would
    // let a squatter claim someone else's address.
    if (!identity.emailVerified) {
      throw new GoogleEmailNotVerifiedError();
    }

    const email = Email.create(identity.email);

    let user = await this.users.findByGoogleId(identity.googleId);
    if (!user) {
      const existing = await this.users.findByEmail(email);
      user = existing
        ? existing.withGoogleId(identity.googleId) // auto-link same-email account
        : User.registerWithGoogle(email, identity.googleId);
      await this.users.save(user);
    }

    const tokens = await this.sessions.issue(user.id);
    return { user: user.toPublic(), ...tokens };
  }
}
