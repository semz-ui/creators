import { BlurView } from 'expo-blur';
import { cssInterop } from 'nativewind';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/shared/lib/cn';

// Let NativeWind drive the BlurView's layout/border via className.
cssInterop(BlurView, { className: 'style' });

export interface GlassSurfaceProps {
  children?: ReactNode;
  /** Blur strength (0–100). */
  intensity?: number;
  /** Layout / border / radius classes for the surface. */
  className?: string;
}

/**
 * Frosted-glass surface: a blurred backdrop under a translucent white wash and
 * a hairline border. The signature material for the app's chrome (back button,
 * tab bar). Cross-platform — Android uses the experimental blur method.
 */
export function GlassSurface({ children, intensity = 40, className }: GlassSurfaceProps) {
  return (
    <BlurView
      intensity={intensity}
      tint="light"
      experimentalBlurMethod="dimezisBlurView"
      className={cn('overflow-hidden border border-white/40', className)}
    >
      {/* Wash lifts contrast over busy content without killing the blur. */}
      <View className="absolute inset-0 bg-white/45" pointerEvents="none" />
      {children}
    </BlurView>
  );
}
