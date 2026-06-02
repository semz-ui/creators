import { InvalidEmailError } from '@modules/auth/domain/auth.errors';
import { Email } from '@modules/auth/domain/value-objects/email';

describe('Email value object', () => {
  it('normalizes by trimming and lowercasing', () => {
    expect(Email.create('  Foo@Bar.COM ').value).toBe('foo@bar.com');
  });

  it('treats equal normalized addresses as equal', () => {
    expect(Email.create('a@b.com').equals(Email.create('A@B.com'))).toBe(true);
  });

  it.each(['nope', 'a@b', '@b.com', 'a b@c.com', ''])('rejects %p', (raw) => {
    expect(() => Email.create(raw)).toThrow(InvalidEmailError);
  });
});
