import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ className, glow, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line-subtle bg-surface p-6',
        glow && 'border-brand/30 shadow-glow-sm',
        className,
      )}
      {...props}
    />
  );
}
