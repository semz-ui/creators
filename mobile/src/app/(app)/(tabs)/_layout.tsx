import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, type ColorValue } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: IconName, unfocused: IconName) {
  function TabIcon({ color, focused: isFocused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : unfocused} size={22} color={color} />;
  }
  return TabIcon;
}

/**
 * Frosted-glass tab bar background so content scrolls translucently beneath it.
 * A heavy blur plus a light, low-opacity wash keeps the glass visibly frosted
 * (not a solid white panel) while keeping labels legible. A top highlight line
 * gives the pane an edge.
 */
function GlassTabBarBackground() {
  return (
    <BlurView
      intensity={90}
      tint="light"
      experimentalBlurMethod="dimezisBlurView"
      style={StyleSheet.absoluteFill}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: 'rgba(255,255,255,0.7)',
        }}
      />
    </BlurView>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        // Float the bar over the content and let the blur show through.
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: 'rgba(203,213,225,0.6)',
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => <GlassTabBarBackground />,
        ...(Platform.OS === 'android' ? { tabBarHideOnKeyboard: true } : {}),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: 'Library', tabBarIcon: tabIcon('albums', 'albums-outline') }}
      />
      <Tabs.Screen
        name="create"
        options={{ title: 'Create', tabBarIcon: tabIcon('add-circle', 'add-circle-outline') }}
      />
      <Tabs.Screen
        name="publications"
        options={{ title: 'Posts', tabBarIcon: tabIcon('send', 'send-outline') }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: tabIcon('ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline'),
        }}
      />
    </Tabs>
  );
}
