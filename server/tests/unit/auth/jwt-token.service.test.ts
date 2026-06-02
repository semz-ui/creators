import { InvalidTokenError } from '@modules/auth/domain/auth.errors';
import { JwtTokenService } from '@modules/auth/infrastructure/jwt-token.service';

const config = {
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'r'.repeat(32),
  accessTtl: '15m',
  refreshTtl: '7d',
};

describe('JwtTokenService', () => {
  const service = new JwtTokenService(config);

  it('issues and verifies an access token', () => {
    const token = service.issueAccessToken('user-1');
    expect(service.verifyAccessToken(token)).toEqual({ userId: 'user-1' });
  });

  it('issues and verifies a refresh token with its claims', () => {
    const token = service.issueRefreshToken({
      userId: 'user-1',
      jti: 'jti-1',
      familyId: 'fam-1',
    });
    expect(service.verifyRefreshToken(token)).toEqual({
      userId: 'user-1',
      jti: 'jti-1',
      familyId: 'fam-1',
    });
  });

  it('rejects a refresh token presented as an access token', () => {
    const refresh = service.issueRefreshToken({ userId: 'u', jti: 'j', familyId: 'f' });
    expect(() => service.verifyAccessToken(refresh)).toThrow(InvalidTokenError);
  });

  it('rejects an access token presented as a refresh token', () => {
    const access = service.issueAccessToken('u');
    expect(() => service.verifyRefreshToken(access)).toThrow(InvalidTokenError);
  });

  it('rejects a garbage token', () => {
    expect(() => service.verifyAccessToken('not-a-jwt')).toThrow(InvalidTokenError);
  });

  it('rejects a token signed with a different secret', () => {
    const other = new JwtTokenService({ ...config, accessSecret: 'z'.repeat(32) });
    const token = other.issueAccessToken('u');
    expect(() => service.verifyAccessToken(token)).toThrow(InvalidTokenError);
  });
});
