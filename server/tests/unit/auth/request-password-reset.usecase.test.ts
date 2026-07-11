import { RequestPasswordReset } from '@modules/auth/application/request-password-reset.usecase';
import { InvalidEmailError } from '@modules/auth/domain/auth.errors';
import type { IEmailSender } from '@modules/auth/domain/ports/email-sender';
import type { IPasswordResetTokenStore } from '@modules/auth/domain/ports/password-reset-token-store';
import type { IUserRepository } from '@modules/auth/domain/ports/user-repository';
import { User } from '@modules/auth/domain/user.entity';
import { Email } from '@modules/auth/domain/value-objects/email';
import { logger } from '@shared/infrastructure/logging/logger';

const CONFIG = { ttlSeconds: 900, resetBaseUrl: 'http://localhost:3000/reset-password' };

function setup(user: User | null = User.register(Email.create('a@b.com'), 'hashed')) {
  const users = {
    findByEmail: jest.fn().mockResolvedValue(user),
    findById: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
  } satisfies Record<keyof IUserRepository, jest.Mock>;

  const resetTokens = {
    issue: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn(),
  } satisfies Record<keyof IPasswordResetTokenStore, jest.Mock>;

  const emailSender = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  } satisfies Record<keyof IEmailSender, jest.Mock>;

  const useCase = new RequestPasswordReset(users, resetTokens, emailSender, CONFIG);
  return { users, resetTokens, emailSender, useCase, user };
}

afterEach(() => jest.restoreAllMocks());

describe('RequestPasswordReset', () => {
  it('issues a token and emails a reset link containing it', async () => {
    const { resetTokens, emailSender, useCase, user } = setup();

    await useCase.execute({ email: 'a@b.com' });

    expect(resetTokens.issue).toHaveBeenCalledTimes(1);
    const [token, userId, ttl] = resetTokens.issue.mock.calls[0] as [string, string, number];
    expect(userId).toBe(user?.id);
    expect(ttl).toBe(CONFIG.ttlSeconds);
    // 32 random bytes → 43 base64url chars, no padding/reserved characters.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    expect(emailSender.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: 'a@b.com',
      resetUrl: `${CONFIG.resetBaseUrl}?token=${token}`,
    });
  });

  it('does nothing (silently) for an unknown email', async () => {
    const { resetTokens, emailSender, useCase } = setup(null);

    await expect(useCase.execute({ email: 'ghost@b.com' })).resolves.toBeUndefined();

    expect(resetTokens.issue).not.toHaveBeenCalled();
    expect(emailSender.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('normalizes the email before lookup', async () => {
    const { users, useCase } = setup();

    await useCase.execute({ email: '  A@B.com ' });

    const email = users.findByEmail.mock.calls[0][0] as Email;
    expect(email.value).toBe('a@b.com');
  });

  it('rejects a malformed email', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({ email: 'nope' })).rejects.toThrow(InvalidEmailError);
  });

  it('still resolves when the email send fails, logging the error', async () => {
    const { emailSender, useCase } = setup();
    emailSender.sendPasswordResetEmail.mockRejectedValue(new Error('provider down'));
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    await expect(useCase.execute({ email: 'a@b.com' })).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('generates a different token on every request', async () => {
    const { resetTokens, useCase } = setup();

    await useCase.execute({ email: 'a@b.com' });
    await useCase.execute({ email: 'a@b.com' });

    const [first] = resetTokens.issue.mock.calls[0] as [string];
    const [second] = resetTokens.issue.mock.calls[1] as [string];
    expect(first).not.toBe(second);
  });
});
