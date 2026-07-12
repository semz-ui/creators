import { createPublicKey, type KeyObject } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { InvalidTokenError } from '../domain/auth.errors';
import type {
  GoogleIdentity,
  IGoogleIdentityVerifier,
} from '../domain/ports/google-identity-verifier';

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
// Google issues under both forms depending on the client library.
const ISSUERS: [string, ...string[]] = ['https://accounts.google.com', 'accounts.google.com'];
const FALLBACK_TTL_MS = 3_600_000;
const REQUEST_TIMEOUT_MS = 10_000;

interface JsonWebKey {
  kid?: string;
  kty?: string;
  [key: string]: unknown;
}

export interface GoogleIdTokenVerifierConfig {
  /** OAuth client id; the token's `aud` claim must match it. */
  clientId: string;
  jwksUrl?: string;
}

/**
 * Verifies Google ID tokens locally against Google's JWKS (RS256).
 *
 * Keys are cached in memory by `kid` with a TTL taken from the JWKS response's
 * Cache-Control max-age (fallback 1h). An unknown `kid` triggers at most one
 * fresh fetch per verify, which covers Google's key rotation.
 */
export class GoogleIdTokenVerifier implements IGoogleIdentityVerifier {
  private keys = new Map<string, KeyObject>();
  private keysExpireAt = 0;
  private inflightFetch: Promise<void> | null = null;

  constructor(private readonly config: GoogleIdTokenVerifierConfig) {}

  async verify(idToken: string): Promise<GoogleIdentity> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new InvalidTokenError('Invalid Google ID token');
    }
    const { kid, alg } = decoded.header;
    if (!kid || alg !== 'RS256') {
      throw new InvalidTokenError('Invalid Google ID token');
    }

    const key = await this.getKey(kid);

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(idToken, key, {
        algorithms: ['RS256'],
        audience: this.config.clientId,
        issuer: ISSUERS,
      }) as jwt.JwtPayload;
    } catch {
      throw new InvalidTokenError('Invalid Google ID token');
    }

    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new InvalidTokenError('Invalid Google ID token');
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      // Google emits email_verified as a boolean or the string 'true'
      // depending on the token variant.
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    };
  }

  /** Resolve a signing key by kid, refetching the JWKS at most once. */
  private async getKey(kid: string): Promise<KeyObject> {
    if (Date.now() >= this.keysExpireAt || !this.keys.has(kid)) {
      await this.refreshKeys();
    }
    const key = this.keys.get(kid);
    if (!key) {
      throw new InvalidTokenError('Invalid Google ID token');
    }
    return key;
  }

  /** Fetch and cache Google's JWKS, deduping concurrent refreshes. */
  private refreshKeys(): Promise<void> {
    this.inflightFetch ??= this.fetchKeys().finally(() => {
      this.inflightFetch = null;
    });
    return this.inflightFetch;
  }

  private async fetchKeys(): Promise<void> {
    const res = await fetch(this.config.jwksUrl ?? JWKS_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new InvalidTokenError('Invalid Google ID token');
    }
    const body = (await res.json()) as { keys?: JsonWebKey[] };

    const keys = new Map<string, KeyObject>();
    for (const jwk of body.keys ?? []) {
      if (typeof jwk.kid !== 'string') continue;
      try {
        keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
      } catch {
        // Skip malformed keys rather than failing every verification.
      }
    }
    this.keys = keys;
    this.keysExpireAt = Date.now() + ttlFromCacheControl(res.headers.get('cache-control'));
  }
}

function ttlFromCacheControl(header: string | null): number {
  const maxAge = header?.match(/max-age=(\d+)/)?.[1];
  return maxAge ? Number(maxAge) * 1000 : FALLBACK_TTL_MS;
}
