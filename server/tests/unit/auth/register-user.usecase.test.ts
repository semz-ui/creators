import { RegisterUser } from '@modules/auth/application/register-user.usecase';
import type { SessionService } from '@modules/auth/application/session.service';
import {
  EmailAlreadyInUseError,
  InvalidEmailError,
  WeakPasswordError,
} from '@modules/auth/domain/auth.errors';
import type { IPasswordHasher } from '@modules/auth/domain/ports/password-hasher';
import type { IUserRepository } from '@modules/auth/domain/ports/user-repository';

function setup() {
  const users = {
    existsByEmail: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findByEmail: jest.fn(),
  } satisfies Record<keyof IUserRepository, jest.Mock>;

  const hasher = {
    hash: jest.fn().mockResolvedValue('HASHED'),
    compare: jest.fn(),
  } satisfies Record<keyof IPasswordHasher, jest.Mock>;

  const sessions = {
    issue: jest.fn().mockResolvedValue({ accessToken: 'A', refreshToken: 'R' }),
  } as unknown as SessionService;

  const useCase = new RegisterUser(users, hasher, sessions);
  return { users, hasher, sessions, useCase };
}

describe('RegisterUser', () => {
  it('hashes the password, persists the user, and returns a session', async () => {
    const { users, hasher, useCase } = setup();

    const result = await useCase.execute({ email: 'New@User.com', password: 'password123' });

    expect(hasher.hash).toHaveBeenCalledWith('password123');
    expect(users.save).toHaveBeenCalledTimes(1);
    const saved = users.save.mock.calls[0][0];
    expect(saved.email).toBe('new@user.com');
    expect(saved.passwordHash).toBe('HASHED');
    expect(result).toEqual({
      user: { id: saved.id, email: 'new@user.com' },
      accessToken: 'A',
      refreshToken: 'R',
    });
  });

  it('rejects a duplicate email and does not persist', async () => {
    const { users, useCase } = setup();
    users.existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute({ email: 'a@b.com', password: 'password123' })).rejects.toThrow(
      EmailAlreadyInUseError,
    );
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({ email: 'nope', password: 'password123' })).rejects.toThrow(
      InvalidEmailError,
    );
  });

  it('rejects a weak password', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({ email: 'a@b.com', password: 'short' })).rejects.toThrow(
      WeakPasswordError,
    );
  });
});
