import { logger } from '@shared/infrastructure/logging/logger';

import { InvalidTokenError } from '../domain/auth.errors';
import type {
  GoogleIdentity,
  IGoogleIdentityVerifier,
} from '../domain/ports/google-identity-verifier';

const STUB_PREFIX = 'stub-google:';

/**
 * No-credentials verifier: accepts tokens of the form
 * `stub-google:<sub>:<email>[:unverified]` so the full sign-in flow works
 * locally and in tests without Google.
 */
export class StubGoogleIdentityVerifier implements IGoogleIdentityVerifier {
  async verify(idToken: string): Promise<GoogleIdentity> {
    if (!idToken.startsWith(STUB_PREFIX)) {
      throw new InvalidTokenError('Invalid Google ID token');
    }
    const [sub, email, flag] = idToken.slice(STUB_PREFIX.length).split(':');
    if (!sub || !email) {
      throw new InvalidTokenError('Invalid Google ID token');
    }
    const identity: GoogleIdentity = {
      googleId: sub,
      email,
      emailVerified: flag !== 'unverified',
    };
    logger.info({ googleId: sub, email }, 'Stub Google verifier: accepted identity');
    return identity;
  }
}
