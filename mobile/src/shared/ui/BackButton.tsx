import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';

import { usePressScale } from '@/shared/lib/usePressScale';

import { GlassSurface } from './GlassSurface';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Animated frosted-glass back control for pushed screens (the app hides native
 * headers). Slides in on mount and springs on press. Falls back to Home when
 * there is no history (e.g. a deep link).
 */
export function BackButton() {
  const router = useRouter();
  const press = usePressScale(0.92);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)/home');
    }
  };

  return (
    <Animated.View
      entering={FadeInLeft.springify().damping(18).mass(0.6)}
      className="mb-4 self-start"
    >
      <AnimatedPressable
        onPress={goBack}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={press.style}
      >
        <GlassSurface
          intensity={50}
          className="flex-row items-center gap-1 rounded-full py-2 pl-2 pr-3.5"
        >
          <Ionicons name="chevron-back" size={16} color="#0284c7" />
          <Text className="font-sans-semibold text-sm text-content-brand">Back</Text>
        </GlassSurface>
      </AnimatedPressable>
    </Animated.View>
  );
}
