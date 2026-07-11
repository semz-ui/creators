import { ResetPassword } from '@modules/auth/application/reset-password.usecase';
import { InvalidTokenError, WeakPasswordError } from '@modules/auth/domain/auth.errors';
import type { IPasswordHasher } from '@modules/auth/domain/ports/password-hasher';
import type { IPasswordResetTokenStore } from '@modules/auth/domain/ports/password-reset-token-store';
import type { IRefreshTokenStore } from '@modules/auth/domain/ports/refresh-token-store';
import type { IUserRepository } from '@modules/auth/domain/ports/user-repository';
import { User } from '@modules/auth/domain/user.entity';
import { Email } from '@modules/auth/domain/value-objects/email';
import { logger } from '@shared/infrastructure/logging/logger';

function setup() {
  const user = User.register(Email.create('a@b.com'), 'old-hash');

  const resetTokens = {
    issue: jest.fn(),
    consume: jest.fn().mockResolvedValue(user.id),
  } satisfies Record<keyof IPasswordResetTokenStore, jest.Mock>;

  const users = {
    findById: jest.fn().mockResolvedValue(user),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
  } satisfies Record<keyof IUserRepository, jest.Mock>;

  const hasher = {
    hash: jest.fn().mockResolvedValue('NEW-HASH'),
    compare: jest.fn(),
  } satisfies Record<keyof IPasswordHasher, jest.Mock>;

  const refreshTokens = {
    save: jest.fn(),
    exists: jest.fn(),
    remove: jest.fn(),
    revokeFamily: jest.fn(),
    revokeUser: jest.fn().mockResolvedValue(undefined),
  } satisfies Record<keyof IRefreshTokenStore, jest.Mock>;

  const useCase = new ResetPassword(resetTokens, users, hasher, refreshTokens);
  return { user, resetTokens, users, hasher, refreshTokens, useCase };
}

describe('ResetPassword', () => {
  it('consumes the token, saves the new hash, and revokes all sessions', async () => {
    const { user, resetTokens, users, hasher, refreshTokens, useCase } = setup();

    await useCase.execute({ token: 'tok-1', password: 'new-password-123' });

    expect(resetTokens.consume).toHaveBeenCalledWith('tok-1');
    expect(hasher.hash).toHaveBeenCalledWith('new-password-123');
    const saved = users.save.mock.calls[0][0] as User;
    expect(saved.id).toBe(user.id);
    expect(saved.passwordHash).toBe('NEW-HASH');
    expect(refreshTokens.revokeUser).toHaveBeenCalledWith(user.id);
  });

  it('still succeeds when session revocation fails, logging the error', async () => {
    const { users, refreshTokens, useCase } = setup();
    refreshTokens.revokeUser.mockRejectedValue(new Error('redis down'));
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    await expect(
      useCase.execute({ token: 'tok-1', password: 'new-password-123' }),
    ).resolves.toBeUndefined();

    expect(users.save).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('rejects a weak password before consuming the token', async () => {
    const { resetTokens, users, useCase } = setup();

    await expect(useCase.execute({ token: 'tok-1', password: 'short' })).rejects.toThrow(
      WeakPasswordError,
    );

    expect(resetTokens.consume).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rejects an unknown or expired token', async () => {
    const { resetTokens, users, refreshTokens, useCase } = setup();
    resetTokens.consume.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'bad', password: 'new-password-123' })).rejects.toThrow(
      InvalidTokenError,
    );

    expect(users.save).not.toHaveBeenCalled();
    expect(refreshTokens.revokeUser).not.toHaveBeenCalled();
  });

  it('rejects when the token resolves to a user that no longer exists', async () => {
    const { users, refreshTokens, useCase } = setup();
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'tok-1', password: 'new-password-123' })).rejects.toThrow(
      InvalidTokenError,
    );

    expect(users.save).not.toHaveBeenCalled();
    expect(refreshTokens.revokeUser).not.toHaveBeenCalled();
  });
});
