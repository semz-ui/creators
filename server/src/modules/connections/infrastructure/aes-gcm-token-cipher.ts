import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import type { ITokenCipher } from '../domain/ports/token-cipher';

const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * AES-256-GCM implementation of {@link ITokenCipher}. The 32-byte key is derived
 * from the configured secret via SHA-256. Output is base64(iv | authTag | ciphertext).
 */
export class AesGcmTokenCipher implements ITokenCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
