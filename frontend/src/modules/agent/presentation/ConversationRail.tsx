import { Plus, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';
import { Skeleton } from '@/shared/ui';

import { useConversations } from '../viewmodels/useConversations';
import { useDeleteConversation } from '../viewmodels/useDeleteConversation';
import { ConversationMenu } from './ConversationMenu';

interface ConversationRailProps {
  onNewChat: () => void;
  /** Mobile only: the rail is a drawer there, since there's no room for it. */
  isDrawerOpen?: boolean | undefined;
  onCloseDrawer?: (() => void) | undefined;
}

/** Past conversations, most recently active first. Resume one by clicking it. */
export function ConversationRail({
  onNewChat,
  isDrawerOpen = false,
  onCloseDrawer,
}: ConversationRailProps) {
  const { data, isPending, isError } = useConversations();
  const { deleteConversation, deletingId, error: deleteError } = useDeleteConversation();
  const conversations = data?.items ?? [];

  const body = (
    <>
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseDrawer?.();
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-content transition-colors hover:border-brand/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Plus className="h-4 w-4 text-brand-accent" />
          New chat
        </button>
      </div>

      <nav
        aria-label="Conversations"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3"
      >
        {isPending ? (
          <div className="flex flex-col gap-1.5 px-1" role="status" aria-label="Loading">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="px-2 py-1.5 text-xs text-content-muted">Couldn&apos;t load your chats.</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-content-muted">
            Your past chats will appear here.
          </p>
        ) : (
          conversations.map((conversation) => (
            <div key={conversation.id} className="group relative">
              <NavLink
                to={`/agent/${conversation.id}`}
                title={conversation.title}
                onClick={onCloseDrawer}
                className={({ isActive }) =>
                  cn(
                    // Right padding keeps the title clear of the menu button.
                    'block truncate rounded-lg py-2 pl-3 pr-9 text-sm transition-colors',
                    isActive
                      ? 'bg-white/8 text-content'
                      : 'text-content-secondary hover:bg-white/5 hover:text-content',
                    deletingId === conversation.id && 'opacity-50',
                  )
                }
              >
                {conversation.title}
              </NavLink>
              {/*
                No `transform` here: a transformed ancestor becomes the
                containing block for `position: fixed`, which would anchor the
                menu's popup to this box instead of the viewport.
              */}
              <div className="absolute inset-y-0 right-1 flex items-center">
                <ConversationMenu
                  title={conversation.title}
                  isDeleting={deletingId === conversation.id}
                  onDelete={() => deleteConversation(conversation.id)}
                />
              </div>
            </div>
          ))
        )}
      </nav>

      {deleteError && <p className="px-3 pb-3 text-xs text-danger">{deleteError}</p>}
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line-subtle bg-surface md:flex">
        {body}
      </aside>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close conversations"
            onClick={onCloseDrawer}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-line-subtle bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line-subtle px-3 py-2">
              <span className="text-sm font-medium text-content-secondary">Chats</span>
              <button
                type="button"
                aria-label="Close conversations"
                onClick={onCloseDrawer}
                className="rounded-md p-1 text-content-secondary transition-colors hover:bg-white/5 hover:text-content"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {body}
          </aside>
        </div>
      )}
    </>
  );
}
