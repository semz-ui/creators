import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Derive the tabBar render-prop argument straight from Tabs (no phantom dep).
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type IconName = keyof typeof Ionicons.glyphMap;
const ICONS: Record<string, { on: IconName; off: IconName }> = {
  home: { on: 'home', off: 'home-outline' },
  library: { on: 'albums', off: 'albums-outline' },
  create: { on: 'add-circle', off: 'add-circle-outline' },
  publications: { on: 'send', off: 'send-outline' },
  more: { on: 'ellipsis-horizontal-circle', off: 'ellipsis-horizontal-circle-outline' },
};

const SPRING = { damping: 18, stiffness: 220, mass: 0.7 };
const ROW_PADDING = 8; // horizontal padding inside the glass pane
const INDICATOR_INSET = 6; // gap between the sliding pill and each tab cell

const ACTIVE = '#0284c7';
const INACTIVE = '#94a3b8';

/**
 * Floating frosted-glass tab bar that hovers above the content (detached from
 * the bottom edge). A soft brand pill springs between tabs as the selection
 * changes; the active icon/label brighten to the brand color.
 */
export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);

  const count = state.routes.length;
  const tabWidth = rowWidth > 0 ? (rowWidth - ROW_PADDING * 2) / count : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    width: Math.max(tabWidth - INDICATOR_INSET * 2, 0),
    transform: [
      { translateX: withSpring(ROW_PADDING + state.index * tabWidth + INDICATOR_INSET, SPRING) },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 10 }}
    >
      <BlurView
        intensity={80}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={{
          borderRadius: 999, // full pill
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.6)',
        }}
      >
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.32)' }]}
        />
        <View
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', paddingHorizontal: ROW_PADDING, paddingVertical: 8 }}
        >
          {tabWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 6,
                  bottom: 6,
                  left: 0,
                  borderRadius: 999,
                  backgroundColor: 'rgba(2,132,199,0.12)',
                },
                indicatorStyle,
              ]}
            />
          ) : null}

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = descriptors[route.key]?.options.title ?? route.name;
            const icon = ICONS[route.name];
            const color = focused ? ACTIVE : INACTIVE;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={label}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 6,
                }}
              >
                {icon ? (
                  <Ionicons name={focused ? icon.on : icon.off} size={22} color={color} />
                ) : null}
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color, marginTop: 2 }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
