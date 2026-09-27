import { ArrowUp } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';

import { Button } from '@/shared/ui';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  canSend: boolean;
  /** Set while an action is awaiting approval — the server rejects turns then. */
  blockedReason?: string | undefined;
}

export function Composer({ value, onChange, onSubmit, canSend, blockedReason }: ComposerProps) {
  const disabled = Boolean(blockedReason);

  // Enter sends; Shift+Enter adds a newline, the convention people expect.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSubmit(event);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <textarea
          aria-label="Message"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={disabled ? 'Answer the request above to continue' : 'Ask for a video…'}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          className="max-h-40 flex-1 resize-none rounded-lg border border-line bg-surface-raised px-3 py-2.5 text-sm text-content transition-all duration-150 placeholder:text-content-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button type="submit" aria-label="Send" disabled={!canSend} className="h-10 w-10 px-0">
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
      {blockedReason && <p className="text-xs text-content-muted">{blockedReason}</p>}
    </form>
  );
}
