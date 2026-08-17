import { Sparkles } from 'lucide-react';

/** Delays so the dots ripple rather than blink in unison. */
const DOT_DELAYS = ['0ms', '150ms', '300ms'];

/**
 * A turn is one slow request — the server runs the model and its tools before
 * answering — so this is on screen for a while. It says the assistant is
 * working without pretending to know how far along it is.
 */
export function ThinkingIndicator() {
  return (
    <div className="mt-5 flex gap-3" role="status" aria-label="Assistant is thinking">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-brand opacity-70">
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-white" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line-subtle bg-surface px-4 py-3">
        {DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-content-secondary"
            style={{ animationDelay: delay }}
          />
        ))}
      </div>
    </div>
  );
}
