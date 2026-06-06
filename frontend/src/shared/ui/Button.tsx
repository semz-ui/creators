import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-content-inverse shadow-sm hover:bg-brand-hover hover:shadow-md hover:-translate-y-0.5',
  secondary:
    'bg-brand-secondary text-content-inverse hover:bg-brand hover:shadow-md hover:-translate-y-0.5',
  ghost: 'bg-transparent text-content hover:bg-sunken',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium',
        // Motion: smooth hover transitions + a tactile press, disabled for reduced motion.
        'transition-all duration-150 ease-out active:translate-y-0 active:scale-[0.97]',
        'motion-reduce:transform-none motion-reduce:transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
