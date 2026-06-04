import { AesGcmTokenCipher } from '@modules/connections/infrastructure/aes-gcm-token-cipher';

describe('AesGcmTokenCipher', () => {
  const cipher = new AesGcmTokenCipher('a-test-secret-at-least-16-chars');

  it('round-trips a value', () => {
    const token = 'ya29.super-secret-oauth-token';
    expect(cipher.decrypt(cipher.encrypt(token))).toBe(token);
  });

  it('produces different ciphertext each time (random IV)', () => {
    expect(cipher.encrypt('same')).not.toBe(cipher.encrypt('same'));
  });

  it('does not leak the plaintext in the ciphertext', () => {
    const enc = cipher.encrypt('plaintext-secret');
    expect(enc).not.toContain('plaintext-secret');
  });

  it('fails to decrypt with a different key', () => {
    const enc = cipher.encrypt('secret');
    const other = new AesGcmTokenCipher('a-different-secret-16-chars-min');
    expect(() => other.decrypt(enc)).toThrow();
  });
});
