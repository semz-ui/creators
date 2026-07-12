import { createPublicKey, generateKeyPairSync, type KeyPairSyncResult } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { InvalidTokenError } from '@modules/auth/domain/auth.errors';
import { GoogleIdTokenVerifier } from '@modules/auth/infrastructure/google-id-token.verifier';

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const ISSUER = 'https://accounts.google.com';

type KeyPair = KeyPairSyncResult<string, string>;

function makeKeyPair(): KeyPair {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

function toJwk(publicKeyPem: string, kid: string): Record<string, unknown> {
  const jwk = createPublicKey(publicKeyPem).export({ format: 'jwk' });
  return { ...jwk, kid, alg: 'RS256', use: 'sig' };
}

function signToken(
  privateKey: string,
  kid: string,
  claims: Record<string, unknown> = {},
  options: jwt.SignOptions = {},
): string {
  return jwt.sign(
    {
      sub: 'sub-1',
      email: 'g@user.com',
      email_verified: true,
      ...claims,
    },
    privateKey,
    {
      algorithm: 'RS256',
      keyid: kid,
      audience: CLIENT_ID,
      issuer: ISSUER,
      expiresIn: '5m',
      ...options,
    },
  );
}

/** Queue JWKS responses; each fetch call consumes one. */
function mockJwksFetch(...responses: { keys: unknown[]; maxAge?: number }[]) {
  const fn = jest.fn();
  for (const response of responses) {
    fn.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(
        response.maxAge !== undefined ? { 'cache-control': `max-age=${response.maxAge}` } : {},
      ),
      json: async () => ({ keys: response.keys }),
    });
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const KEYS = makeKeyPair();

afterEach(() => jest.restoreAllMocks());

describe('GoogleIdTokenVerifier', () => {
  it('verifies a valid token and extracts the identity', async () => {
    mockJwksFetch({ keys: [toJwk(KEYS.publicKey, 'kid-1')] });
    const verifier = new GoogleIdTokenVerifier({ clientId: CLIENT_ID });

    const identity = await verifier.verify(signToken(KEYS.privateKey, 'kid-1'));

    expect(identity).toEqual({ googleId: 'sub-1', email: 'g@user.com', emailVerified: true });
  });

  it('caches the JWKS across verifications', async () => {
    const fetchMock = mockJwksFetch({ keys: [toJwk(KEYS.publicKey, 'kid-1')] });
    const verifier = new GoogleIdTokenVerifier({ clientId: CLIENT_ID });

    await verifier.verify(signToken(KEYS.privateKey, 'kid-1'));
    await verifier.verify(signToken(KEYS.privateKey, 'kid-1'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches once on an unknown kid (key rotation)', async () => {
    const rotated = makeKeyPair();
    const fetchMock = mockJwksFetch(
      { keys: [toJwk(KEYS.publicKey, 'kid-1')] },
      { keys: [toJwk(rotated.publicKey, 'kid-2')] },
    );
    const verifier = new GoogleIdTokenVerifier({ clientId: CLIENT_ID });

    await verifier.verify(signToken(KEYS.privateKey, 'kid-1'));
    const identity = await verifier.verify(signToken(rotated.privateKey, 'kid-2'));

    expect(identity.googleId).toBe('sub-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects when the kid is still unknown after a fresh fetch', async () => {
    mockJwksFetch(
      { keys: [toJwk(KEYS.publicKey, 'kid-1')] },
      { keys: [toJwk(KEYS.publicKey, 'kid-1')] },
    );
    const verifier = new GoogleIdTokenVerifier({ clientId: CLIENT_ID });
    await verifier.verify(signToken(KEYS.privateKey, 'kid-1'));

    await expect(verifier.verify(signToken(KEYS.privateKey, 'kid-ghost'))).rejects.toThrow(
      InvalidTokenError,
    );
  });

  it('honors the JWKS Cache-Control max-age', async () => {
    jest.useFakeTimers();
    try {
      const fetchMock = mockJwksFetch(
        { keys: [toJwk(KEYS.publicKey, 'kid-1')], maxAge: 60 },
        { keys: [toJwk(KEYS.publicKey, 'kid-1')], maxAge: 60 },
      );
      const verifier = new GoogleIdTokenVerifier({ clientId: CLIENT_ID });

      await verifier.verify(signToken(KEYS.privateKey, 'kid-1'));
      jest.advanceTimersByTime(61_000);
      await verifier.verify(signToken(KEYS.privateKey, 'kid-1'));

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ['bad signature', () => signToken(makeKeyPair().privateKey, 'kid-1')],
    ['wrong audience', () => signToken(KEYS.privateKey, 'kid-1', {}, { audience: 'other-app' })],
    [
      'wrong issuer',
      () => signToken(KEYS.privateKey, 'kid-1', {}, { issuer: 'https://evil.example' }),
    ],
    ['expired', () => signToken(KEYS.privateKey, 'kid-1', {}, { expiresIn: '-1m' })],
    [
      'missing kid',
      () => jwt.sign({ sub: 's', email: 'e@x.com' }, KEYS.privateKey, { algorithm: 'RS256' }),
    ],
    [
      'HS256 token',
      () => jwt.sign({ sub: 's', email: 'e@x.com' }, 'shared-secret', { keyid: 'kid-1' }),
    ],
    ['garbage string', () => 'not-a-jwt'],
    ['missing email claim', () => signToken(KEYS.privateKey, 'kid-1', { email: undefined })],
  ])('rejects: %s', async (_label, makeToken) => {
    mockJwksFetch(
      { keys: [toJwk(KEYS.publicKey, 'kid-1')] },
      { keys: [toJwk(KEYS.publicKey, 'kid-1')] },
    );
    const verifier = new GoogleIdTokenVerifier({ clientId: CLIENT_ID });

    await expect(verifier.verify(makeToken())).rejects.toThrow(InvalidTokenError);
  });

  it("accepts email_verified as the string 'true'", async () => {
    mockJwksFetch({ keys: [toJwk(KEYS.publicKey, 'kid-1')] });
    const verifier = new GoogleIdTokenVerifier({ clientId: CLIENT_ID });

    const identity = await verifier.verify(
      signToken(KEYS.privateKey, 'kid-1', { email_verified: 'true' }),
    );

    expect(identity.emailVerified).toBe(true);
  });

  it('treats a false email_verified as unverified', async () => {
    mockJwksFetch({ keys: [toJwk(KEYS.publicKey, 'kid-1')] });
    const verifier = new GoogleIdTokenVerifier({ clientId: CLIENT_ID });

    const identity = await verifier.verify(
      signToken(KEYS.privateKey, 'kid-1', { email_verified: false }),
    );

    expect(identity.emailVerified).toBe(false);
  });
});
