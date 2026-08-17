import { cn } from '@/shared/lib/cn';

import type { AgentRole } from '../data/agent.types';

interface MessageBubbleProps {
  role: AgentRole;
  text: string;
  /** Dims the bubble while the turn it belongs to is still in flight. */
  pending?: boolean | undefined;
}

/**
 * One thing that was said. Alignment is the list's job — a bubble only knows
 * how it looks, so tool output can sit flush under an assistant turn.
 */
export function MessageBubble({ role, text, pending }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'w-fit max-w-full whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'rounded-br-md bg-gradient-brand text-white shadow-glow-sm'
          : 'rounded-bl-md border border-line-subtle bg-surface text-content',
        pending && 'opacity-60',
      )}
    >
      {text}
    </div>
  );
}
