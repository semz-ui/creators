/**
 * Symmetric cipher for protecting OAuth tokens at rest. Implemented in
 * infrastructure; used by the repository so plaintext tokens never touch the DB.
 */
export interface ITokenCipher {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}
