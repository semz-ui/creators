import { MessageSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { ModeSwitch } from '@/app/layout/ModeSwitch';
import { Button, EmptyState, Spinner } from '@/shared/ui';

import { useAgentChatViewModel } from '../viewmodels/useAgentChatViewModel';
import { Composer } from './Composer';
import { ConversationRail } from './ConversationRail';
import { MessageList } from './MessageList';
import { PendingActionCard } from './PendingActionCard';

const SUGGESTIONS = [
  'Make a 15 second neon city timelapse',
  'What videos do I have?',
  'Which accounts am I connected to?',
];

/** Full-screen assistant shell: history rail, transcript, composer. */
export function AgentPage() {
  const { conversationId } = useParams();
  const agentChatViewModel = useAgentChatViewModel(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, pendingAction } = agentChatViewModel;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pendingAction]);

  return (
    <div className="flex h-screen bg-canvas">
      <ConversationRail onNewChat={agentChatViewModel.startNewChat} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-line-subtle px-4 py-3 sm:px-6">
          <span className="font-display text-lg font-bold">
            <span className="text-gradient-brand">Reelo</span>{' '}
            <span className="text-content-secondary">Assistant</span>
          </span>
          <div className="flex items-center gap-2">
            {/* The rail owns this on wider screens, where it is visible. */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={agentChatViewModel.startNewChat}
            >
              New chat
            </Button>
            <ModeSwitch />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {agentChatViewModel.isLoading ? (
              <div className="flex justify-center py-20">
                <Spinner />
              </div>
            ) : agentChatViewModel.isLoadError ? (
              <p className="py-20 text-center text-content-secondary">
                Couldn&apos;t load this conversation.
              </p>
            ) : messages.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  icon={MessageSquare}
                  title="Tell me what to make"
                  description="I can generate a video from a prompt and publish it to your connected accounts — I'll always check with you before anything gets posted."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="secondary"
                          size="sm"
                          onClick={() => agentChatViewModel.setDraft(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  }
                />
              </div>
            ) : (
              <>
                <MessageList messages={messages} isSending={agentChatViewModel.isSending} />
                {pendingAction && (
                  <PendingActionCard
                    action={pendingAction}
                    isResolving={agentChatViewModel.isResolving}
                    onApprove={agentChatViewModel.approve}
                    onReject={agentChatViewModel.reject}
                  />
                )}
                {agentChatViewModel.isSending && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-content-muted">
                    <Spinner />
                    Thinking…
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </main>

        <div className="shrink-0 border-t border-line-subtle px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <Composer
              value={agentChatViewModel.draft}
              onChange={agentChatViewModel.setDraft}
              onSubmit={agentChatViewModel.onSubmit}
              canSend={agentChatViewModel.canSend}
              blockedReason={
                pendingAction ? 'Approve or reject the request above to keep going.' : undefined
              }
            />
            {agentChatViewModel.formError && (
              <p className="mt-2 text-sm text-danger">{agentChatViewModel.formError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
