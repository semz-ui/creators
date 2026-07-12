import { User } from '@modules/auth/domain/user.entity';
import { Email } from '@modules/auth/domain/value-objects/email';

describe('User entity', () => {
  it('register assigns a UUID id and timestamps', () => {
    const user = User.register(Email.create('a@b.com'), 'hashed');

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.email).toBe('a@b.com');
    expect(user.passwordHash).toBe('hashed');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('toPublic omits the password hash', () => {
    const user = User.register(Email.create('a@b.com'), 'hashed');
    const pub = user.toPublic();

    expect(pub).toEqual({ id: user.id, email: 'a@b.com' });
    expect(pub).not.toHaveProperty('passwordHash');
  });

  it('withNewPassword returns a copy with the new hash, leaving the original intact', () => {
    const original = User.register(Email.create('a@b.com'), 'old-hash');
    const updated = original.withNewPassword('new-hash');

    expect(updated).not.toBe(original);
    expect(updated.passwordHash).toBe('new-hash');
    expect(updated.id).toBe(original.id);
    expect(updated.email).toBe(original.email);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
    expect(original.passwordHash).toBe('old-hash');
  });

  it('registerWithGoogle creates a password-less user linked to the Google id', () => {
    const user = User.registerWithGoogle(Email.create('g@user.com'), 'sub-1');

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.email).toBe('g@user.com');
    expect(user.passwordHash).toBeNull();
    expect(user.googleId).toBe('sub-1');
  });

  it('withGoogleId links a copy, preserving id and password hash', () => {
    const original = User.register(Email.create('a@b.com'), 'hashed');
    const linked = original.withGoogleId('sub-1');

    expect(linked).not.toBe(original);
    expect(linked.googleId).toBe('sub-1');
    expect(linked.id).toBe(original.id);
    expect(linked.passwordHash).toBe('hashed');
    expect(linked.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
    expect(original.googleId).toBeNull();
  });

  it('round-trips through a snapshot', () => {
    const original = User.register(Email.create('a@b.com'), 'hashed');
    const restored = User.fromSnapshot(original.toSnapshot());

    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
  });

  it('round-trips a Google-only user (null password) through a snapshot', () => {
    const original = User.registerWithGoogle(Email.create('g@user.com'), 'sub-1');
    const restored = User.fromSnapshot(original.toSnapshot());

    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
    expect(restored.passwordHash).toBeNull();
  });
});
