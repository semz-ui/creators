import { WeakPasswordError } from '@modules/auth/domain/auth.errors';
import { Password } from '@modules/auth/domain/value-objects/password';

describe('Password value object', () => {
  it('accepts a password within policy', () => {
    expect(Password.create('password123').value).toBe('password123');
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(() => Password.create('short')).toThrow(WeakPasswordError);
  });

  it('rejects passwords longer than 72 characters', () => {
    expect(() => Password.create('a'.repeat(73))).toThrow(WeakPasswordError);
  });
});
