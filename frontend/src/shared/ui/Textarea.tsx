import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | undefined;
  error?: string | undefined;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-content-secondary">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'min-h-28 rounded-lg border bg-surface-raised px-3 py-2 text-sm text-content placeholder:text-content-muted',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/50 focus-visible:shadow-glow-sm',
          error ? 'border-danger/60' : 'border-line',
          className,
        )}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
});
