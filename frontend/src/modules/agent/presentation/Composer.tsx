import { ArrowUp } from 'lucide-react';
import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent, type RefObject } from 'react';

import { Button } from '@/shared/ui';

/** Roughly six lines — past that the box scrolls instead of eating the page. */
const MAX_HEIGHT_PX = 160;

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  canSend: boolean;
  /** Set while an action is awaiting approval — the server rejects turns then. */
  blockedReason?: string | undefined;
  /** Lets the page focus the box, e.g. after a suggestion is picked. */
  textareaRef?: RefObject<HTMLTextAreaElement> | undefined;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  canSend,
  blockedReason,
  textareaRef,
}: ComposerProps) {
  const disabled = Boolean(blockedReason);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? fallbackRef;

  // Grow with the text instead of scrolling a one-line box — a prompt worth
  // writing is usually longer than a line, and you should be able to see it.
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value, ref]);

  // Enter sends; Shift+Enter adds a newline, the convention people expect.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSubmit(event);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface-raised p-1.5 transition-colors focus-within:border-brand/60 focus-within:ring-1 focus-within:ring-brand/30">
        <textarea
          ref={ref}
          aria-label="Message"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={disabled ? 'Answer the request above to continue' : 'Ask for a video…'}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-content outline-none placeholder:text-content-muted disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          type="submit"
          aria-label="Send"
          disabled={!canSend}
          className="h-9 w-9 shrink-0 px-0"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
      {blockedReason ? (
        <p className="text-xs text-content-muted">{blockedReason}</p>
      ) : (
        <p className="hidden text-xs text-content-muted sm:block">
          Enter to send · Shift+Enter for a new line
        </p>
      )}
    </form>
  );
}
