import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Stretch to the container width. */
  block?: boolean;
}

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand active:bg-brand-hover',
  secondary: 'bg-surface border border-line active:bg-sunken',
  ghost: 'bg-transparent active:bg-sunken',
  danger: 'bg-danger-bg active:opacity-80',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-content-inverse',
  secondary: 'text-content',
  ghost: 'text-content-brand',
  danger: 'text-danger',
};

const SIZE: Record<Size, { container: string; label: string }> = {
  sm: { container: 'px-3 py-2 rounded-lg', label: 'text-sm' },
  md: { container: 'px-4 py-3 rounded-xl', label: 'text-base' },
  lg: { container: 'px-5 py-4 rounded-2xl', label: 'text-lg' },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  disabled,
  className,
  ...rest
}: ButtonProps & { className?: string }) {
  const isDisabled = Boolean(disabled) || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2',
        CONTAINER[variant],
        SIZE[size].container,
        block && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#ffffff' : '#0284c7'} />
      ) : null}
      <Text className={cn('font-sans-semibold', LABEL[variant], SIZE[size].label)}>{title}</Text>
    </Pressable>
  );
}
