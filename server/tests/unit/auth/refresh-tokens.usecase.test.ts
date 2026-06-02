import { RefreshTokens } from '@modules/auth/application/refresh-tokens.usecase';
import type { SessionService } from '@modules/auth/application/session.service';
import { InvalidTokenError } from '@modules/auth/domain/auth.errors';
import type { IRefreshTokenStore } from '@modules/auth/domain/ports/refresh-token-store';
import type { ITokenService } from '@modules/auth/domain/ports/token-service';

function setup() {
  const tokens = {
    issueAccessToken: jest.fn(),
    verifyAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    verifyRefreshToken: jest
      .fn()
      .mockReturnValue({ userId: 'u1', jti: 'jti-1', familyId: 'fam-1' }),
  } satisfies Record<keyof ITokenService, jest.Mock>;

  const store = {
    save: jest.fn(),
    exists: jest.fn().mockResolvedValue(true),
    remove: jest.fn(),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
    revokeUser: jest.fn(),
  } satisfies Record<keyof IRefreshTokenStore, jest.Mock>;

  const sessions = {
    rotate: jest.fn().mockResolvedValue({ accessToken: 'A2', refreshToken: 'R2' }),
  } as unknown as SessionService;

  return { tokens, store, sessions, useCase: new RefreshTokens(tokens, store, sessions) };
}

describe('RefreshTokens', () => {
  it('rotates when the presented token is still active', async () => {
    const { store, sessions, useCase } = setup();

    const result = await useCase.execute({ refreshToken: 'R1' });

    expect(store.exists).toHaveBeenCalledWith('jti-1');
    expect(sessions.rotate).toHaveBeenCalledWith('u1', 'fam-1', 'jti-1');
    expect(result).toEqual({ accessToken: 'A2', refreshToken: 'R2' });
  });

  it('revokes the family and rejects when the token was already rotated (reuse)', async () => {
    const { store, sessions, useCase } = setup();
    store.exists.mockResolvedValue(false);

    await expect(useCase.execute({ refreshToken: 'R1' })).rejects.toThrow(InvalidTokenError);
    expect(store.revokeFamily).toHaveBeenCalledWith('fam-1');
    expect(sessions.rotate).not.toHaveBeenCalled();
  });

  it('rejects an unverifiable token', async () => {
    const { tokens, useCase } = setup();
    tokens.verifyRefreshToken.mockImplementation(() => {
      throw new InvalidTokenError();
    });

    await expect(useCase.execute({ refreshToken: 'bad' })).rejects.toThrow(InvalidTokenError);
  });
});
