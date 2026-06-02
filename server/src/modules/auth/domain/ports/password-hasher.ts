/** Port for hashing and verifying passwords. Implemented in infrastructure. */
export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
