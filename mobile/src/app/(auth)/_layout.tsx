import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/modules/auth/session/session.store';

/** Public auth screens; bounce already-authenticated users into the app. */
export default function AuthLayout() {
  const isAuthenticated = useSessionStore((s) => Boolean(s.refreshToken));
  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
