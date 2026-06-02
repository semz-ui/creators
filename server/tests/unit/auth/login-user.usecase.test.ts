import { LoginUser } from '@modules/auth/application/login-user.usecase';
import type { SessionService } from '@modules/auth/application/session.service';
import { InvalidCredentialsError } from '@modules/auth/domain/auth.errors';
import type { IPasswordHasher } from '@modules/auth/domain/ports/password-hasher';
import type { IUserRepository } from '@modules/auth/domain/ports/user-repository';
import { User } from '@modules/auth/domain/user.entity';
import { Email } from '@modules/auth/domain/value-objects/email';

function setup() {
  const existing = User.register(Email.create('a@b.com'), 'STORED_HASH');

  const users = {
    existsByEmail: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(existing),
  } satisfies Record<keyof IUserRepository, jest.Mock>;

  const hasher = {
    hash: jest.fn(),
    compare: jest.fn().mockResolvedValue(true),
  } satisfies Record<keyof IPasswordHasher, jest.Mock>;

  const sessions = {
    issue: jest.fn().mockResolvedValue({ accessToken: 'A', refreshToken: 'R' }),
  } as unknown as SessionService;

  return { existing, users, hasher, sessions, useCase: new LoginUser(users, hasher, sessions) };
}

describe('LoginUser', () => {
  it('returns a session on valid credentials', async () => {
    const { existing, hasher, useCase } = setup();

    const result = await useCase.execute({ email: 'a@b.com', password: 'password123' });

    expect(hasher.compare).toHaveBeenCalledWith('password123', 'STORED_HASH');
    expect(result.user).toEqual({ id: existing.id, email: 'a@b.com' });
    expect(result.accessToken).toBe('A');
  });

  it('rejects an unknown email', async () => {
    const { users, useCase } = setup();
    users.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute({ email: 'a@b.com', password: 'password123' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('rejects a wrong password', async () => {
    const { hasher, useCase } = setup();
    hasher.compare.mockResolvedValue(false);

    await expect(useCase.execute({ email: 'a@b.com', password: 'wrong-password' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('treats a malformed email as invalid credentials (no enumeration)', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({ email: 'nope', password: 'password123' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });
});
