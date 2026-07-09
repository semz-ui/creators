import { View, type ViewProps } from 'react-native';

import { cn } from '@/shared/lib/cn';

/** Surface container with the app's standard border + radius. */
export function Card({ className, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-2xl border border-line-subtle bg-surface p-5', className)}
      {...rest}
    />
  );
}
