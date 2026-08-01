import { cn } from '@/shared/lib/cn';

import type { AgentRole } from '../data/agent.types';

interface MessageBubbleProps {
  role: AgentRole;
  text: string;
  /** Dims the bubble while the turn it belongs to is still in flight. */
  pending?: boolean | undefined;
}

export function MessageBubble({ role, text, pending }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm sm:max-w-[70%]',
          isUser
            ? 'bg-gradient-brand text-white'
            : 'border border-line-subtle bg-surface text-content',
          pending && 'opacity-60',
        )}
      >
        {text}
      </div>
    </div>
  );
}
