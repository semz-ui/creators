import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/modules/auth/session/session.store';

/**
 * Auth guard for everything inside the app. Reactive: clearing the session
 * (logout, failed refresh) immediately redirects to login.
 */
export default function AppLayout() {
  const isAuthenticated = useSessionStore((s) => Boolean(s.refreshToken));
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
