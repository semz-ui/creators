/** Identity claims extracted from a verified Google ID token. */
export interface GoogleIdentity {
  /** Google's stable account id (the token's `sub` claim). */
  googleId: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Port for verifying a Google ID token presented by a client. Implementations
 * must reject anything not provably issued by Google for our client id.
 */
export interface IGoogleIdentityVerifier {
  verify(idToken: string): Promise<GoogleIdentity>;
}
