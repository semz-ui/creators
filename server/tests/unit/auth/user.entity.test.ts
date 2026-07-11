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

  it('round-trips through a snapshot', () => {
    const original = User.register(Email.create('a@b.com'), 'hashed');
    const restored = User.fromSnapshot(original.toSnapshot());

    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
  });
});
