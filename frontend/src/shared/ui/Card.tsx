import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border border-line-subtle bg-surface p-6 shadow-sm', className)}
      {...props}
    />
  );
}
