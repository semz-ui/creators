import { Platform } from 'react-native';

// The Android emulator reaches the host machine via 10.0.2.2, not localhost.
// Physical devices need the host's LAN IP via EXPO_PUBLIC_API_URL (see README).
const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:4000',
  default: 'http://localhost:4000',
});

/**
 * Mobile runtime configuration, read from Expo public env vars (must be
 * EXPO_PUBLIC_*). Import this instead of touching `process.env` directly.
 */
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
} as const;
