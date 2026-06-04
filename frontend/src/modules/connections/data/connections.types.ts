export type Platform = 'facebook' | 'instagram' | 'youtube' | 'tiktok';
export type ConnectionStatus = 'active' | 'revoked' | 'expired';

export interface Connection {
  id: string;
  platform: Platform;
  displayName: string;
  externalAccountId: string;
  status: ConnectionStatus;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionList {
  items: Connection[];
}

export interface StartConnectionResult {
  authorizationUrl: string;
}

export const PLATFORMS: ReadonlyArray<{ id: Platform; label: string }> = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
];
