/**
 * Port for persisting a generated video and exposing it at a public,
 * browser-playable URL. Needed by generators whose output is authenticated
 * binary (e.g. Sora) rather than a hosted URL.
 */
export interface IVideoStorage {
  /**
   * Upload `data` under `key` and return a public URL. Implementations should
   * treat `key` as a stable id (same key overwrites), so repeated uploads of
   * the same job are idempotent.
   */
  upload(data: Buffer, key: string, contentType: string): Promise<string>;
}
