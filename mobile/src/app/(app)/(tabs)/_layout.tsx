import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/shared/ui/GlassTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      // Float a custom frosted-glass bar over the content instead of the
      // default docked tab bar; titles drive the labels + accessibility.
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="publications" options={{ title: 'Posts' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
