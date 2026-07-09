import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-white/5 text-content-secondary',
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  success: 'bg-success-bg text-success shadow-glow-success',
  danger: 'bg-danger-bg text-danger shadow-glow-danger',
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
