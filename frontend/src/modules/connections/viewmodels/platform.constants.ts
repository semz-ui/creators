import type { Platform } from '../data/connections.types';

export const PLATFORMS: ReadonlyArray<{ id: Platform; label: string }> = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
];

/** Display name for a platform, for rendering one the user didn't pick from PLATFORMS. */
export function platformLabel(platform: Platform): string {
  return PLATFORMS.find((p) => p.id === platform)?.label ?? platform;
}
