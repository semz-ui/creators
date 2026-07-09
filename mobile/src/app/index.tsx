import { Redirect } from 'expo-router';

import { useSessionStore } from '@/modules/auth/session/session.store';

/** Entry point: route to the app or to login based on the restored session. */
export default function Index() {
  const isAuthenticated = useSessionStore((s) => Boolean(s.refreshToken));
  return <Redirect href={isAuthenticated ? '/(app)/(tabs)/home' : '/(auth)/login'} />;
}
