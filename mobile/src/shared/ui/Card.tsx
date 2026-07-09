import type { ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { cn } from '@/shared/lib/cn';

export interface CardProps extends ViewProps {
  className?: string;
  /** Stagger the entrance (ms) — pass an index-based delay in lists. */
  delay?: number;
  /** Disable the entrance animation (e.g. when the card is itself animated). */
  animate?: boolean;
}

/** Surface container with the app's standard border + radius; fades up on mount. */
export function Card({ className, delay = 0, animate = true, ...rest }: CardProps) {
  return (
    <Animated.View
      entering={animate ? FadeInDown.duration(360).delay(delay) : undefined}
      className={cn('rounded-2xl border border-line-subtle bg-surface p-5', className)}
      {...rest}
    />
  );
}
