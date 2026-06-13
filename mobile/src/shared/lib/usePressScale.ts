import { useCallback } from 'react';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const SPRING = { damping: 15, stiffness: 320, mass: 0.5 };

/**
 * Tactile press feedback: springs a view down to `pressedScale` while held and
 * back on release. Returns the animated style plus press handlers to spread
 * onto a Pressable.
 */
export function usePressScale(pressedScale = 0.96) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Reanimated shared values are intentionally mutable refs; the React Compiler
  // lint treats them as immutable, so the assignments are explicitly allowed.
  const onPressIn = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(pressedScale, SPRING);
  }, [scale, pressedScale]);

  const onPressOut = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, SPRING);
  }, [scale]);

  return { style, onPressIn, onPressOut };
}
