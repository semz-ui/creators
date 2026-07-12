import type { SessionService } from '@modules/auth/application/session.service';
import { SignInWithGoogle } from '@modules/auth/application/sign-in-with-google.usecase';
import {
  GoogleEmailNotVerifiedError,
  InvalidEmailError,
  InvalidTokenError,
} from '@modules/auth/domain/auth.errors';
import type { IGoogleIdentityVerifier } from '@modules/auth/domain/ports/google-identity-verifier';
import type { IUserRepository } from '@modules/auth/domain/ports/user-repository';
import { User } from '@modules/auth/domain/user.entity';
import { Email } from '@modules/auth/domain/value-objects/email';

const IDENTITY = { googleId: 'sub-1', email: 'g@user.com', emailVerified: true };

function setup() {
  const verifier = {
    verify: jest.fn().mockResolvedValue({ ...IDENTITY }),
  } satisfies Record<keyof IGoogleIdentityVerifier, jest.Mock>;

  const users = {
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),
    findByGoogleId: jest.fn().mockResolvedValue(null),
    existsByEmail: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
  } satisfies Record<keyof IUserRepository, jest.Mock>;

  const sessions = {
    issue: jest.fn().mockResolvedValue({ accessToken: 'A', refreshToken: 'R' }),
  } as unknown as SessionService;

  const useCase = new SignInWithGoogle(verifier, users, sessions);
  return { verifier, users, sessions, useCase };
}

describe('SignInWithGoogle', () => {
  it('issues a session without saving when the googleId is already linked', async () => {
    const { users, sessions, useCase } = setup();
    const linked = User.registerWithGoogle(Email.create('g@user.com'), 'sub-1');
    users.findByGoogleId.mockResolvedValue(linked);

    const result = await useCase.execute({ idToken: 'tok' });

    expect(users.save).not.toHaveBeenCalled();
    expect(sessions.issue).toHaveBeenCalledWith(linked.id);
    expect(result).toEqual({
      user: { id: linked.id, email: 'g@user.com' },
      accessToken: 'A',
      refreshToken: 'R',
    });
  });

  it('creates a password-less user on first sign-in', async () => {
    const { users, useCase } = setup();

    const result = await useCase.execute({ idToken: 'tok' });

    const saved = users.save.mock.calls[0][0] as User;
    expect(saved.googleId).toBe('sub-1');
    expect(saved.passwordHash).toBeNull();
    expect(saved.email).toBe('g@user.com');
    expect(result.user.id).toBe(saved.id);
  });

  it('auto-links an existing account with the same verified email', async () => {
    const { users, sessions, useCase } = setup();
    const existing = User.register(Email.create('g@user.com'), 'HASH');
    users.findByEmail.mockResolvedValue(existing);

    await useCase.execute({ idToken: 'tok' });

    const saved = users.save.mock.calls[0][0] as User;
    expect(saved.id).toBe(existing.id);
    expect(saved.googleId).toBe('sub-1');
    expect(saved.passwordHash).toBe('HASH');
    expect(sessions.issue).toHaveBeenCalledWith(existing.id);
  });

  it('rejects an unverified email before touching the repository', async () => {
    const { verifier, users, sessions, useCase } = setup();
    verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });

    await expect(useCase.execute({ idToken: 'tok' })).rejects.toThrow(GoogleEmailNotVerifiedError);

    expect(users.findByGoogleId).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('propagates verifier failures', async () => {
    const { verifier, useCase } = setup();
    verifier.verify.mockRejectedValue(new InvalidTokenError());

    await expect(useCase.execute({ idToken: 'garbage' })).rejects.toThrow(InvalidTokenError);
  });

  it('normalizes the email from Google before lookup', async () => {
    const { verifier, users, useCase } = setup();
    verifier.verify.mockResolvedValue({ ...IDENTITY, email: '  G@User.com ' });

    await useCase.execute({ idToken: 'tok' });

    const email = users.findByEmail.mock.calls[0][0] as Email;
    expect(email.value).toBe('g@user.com');
    const saved = users.save.mock.calls[0][0] as User;
    expect(saved.email).toBe('g@user.com');
  });

  it('rejects a malformed email claim', async () => {
    const { verifier, useCase } = setup();
    verifier.verify.mockResolvedValue({ ...IDENTITY, email: 'not-an-email' });

    await expect(useCase.execute({ idToken: 'tok' })).rejects.toThrow(InvalidEmailError);
  });
});
