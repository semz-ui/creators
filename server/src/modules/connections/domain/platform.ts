import { UnsupportedPlatformError } from './connection.errors';

export type Platform = 'facebook' | 'instagram' | 'youtube' | 'tiktok';

export const PLATFORMS: readonly Platform[] = ['facebook', 'instagram', 'youtube', 'tiktok'];

/** Narrow an arbitrary string to a supported Platform, or throw. */
export function parsePlatform(raw: string): Platform {
  if ((PLATFORMS as readonly string[]).includes(raw)) {
    return raw as Platform;
  }
  throw new UnsupportedPlatformError(raw);
}
