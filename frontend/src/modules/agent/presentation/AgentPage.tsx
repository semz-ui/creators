import { MessageSquare, PanelLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ModeSwitch } from '@/app/layout/ModeSwitch';
import { Button, EmptyState, Spinner } from '@/shared/ui';

import { useAgentChatViewModel } from '../viewmodels/useAgentChatViewModel';
import { Composer } from './Composer';
import { ConversationRail } from './ConversationRail';
import { MessageList } from './MessageList';
import { PendingActionCard } from './PendingActionCard';
import { ThinkingIndicator } from './ThinkingIndicator';

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
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { messages, pendingAction, isSending } = agentChatViewModel;

  // Jumping to the bottom of a conversation you just opened should be instant;
  // only movement you caused — a new message — is worth animating.
  const isFirstPaintRef = useRef(true);
  useEffect(() => {
    isFirstPaintRef.current = true;
    setIsDrawerOpen(false);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isFirstPaintRef.current ? 'auto' : 'smooth',
      block: 'end',
    });
    isFirstPaintRef.current = false;
  }, [messages.length, pendingAction, isSending]);

  const applySuggestion = (suggestion: string) => {
    agentChatViewModel.setDraft(suggestion);
    composerRef.current?.focus();
  };

  return (
    <div className="flex h-screen bg-canvas">
      <ConversationRail
        onNewChat={agentChatViewModel.startNewChat}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {/* The rail is always visible on wider screens; here it's a drawer. */}
            <button
              type="button"
              aria-label="Open conversations"
              onClick={() => setIsDrawerOpen(true)}
              className="-ml-1 rounded-lg p-1.5 text-content-secondary transition-colors hover:bg-white/5 hover:text-content md:hidden"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
            <span className="truncate font-display text-lg font-bold">
              <span className="text-gradient-brand">Reelo</span>{' '}
              <span className="text-content-secondary">Assistant</span>
            </span>
          </div>
          <ModeSwitch />
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
                          onClick={() => applySuggestion(suggestion)}
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
                <MessageList messages={messages} isSending={isSending} />
                {pendingAction && (
                  <PendingActionCard
                    action={pendingAction}
                    isResolving={agentChatViewModel.isResolving}
                    onApprove={agentChatViewModel.approve}
                    onReject={agentChatViewModel.reject}
                  />
                )}
                {isSending && <ThinkingIndicator />}
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
              textareaRef={composerRef}
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
