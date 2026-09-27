import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { HttpError } from '@/shared/data/http-error';

import { agentApi } from '../data/agent.api';
import { agentKeys } from '../data/query-keys';
import type { ActionDecision, AgentMessage, Conversation } from '../data/agent.types';
import { useConversation } from './useConversation';

interface ResolveInput {
  conversationId: string;
  toolUseId: string;
  decision: ActionDecision;
}

/**
 * View-model for the assistant chat. Owns the composer, the optimistic user
 * bubble shown while a turn is in flight, and the two mutations that drive a
 * conversation forward.
 *
 * A turn is a single slow POST — the server runs the model and its tools before
 * responding — so the optimistic bubble is what keeps the UI honest meanwhile.
 */
export function useAgentChatViewModel(conversationId?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);

  const query = useConversation(conversationId);

  const applyConversation = (conversation: Conversation) => {
    // Both mutations return the whole conversation, so seed the cache directly
    // instead of invalidating and paying for a refetch.
    queryClient.setQueryData(agentKeys.detail(conversation.id), conversation);
    // The rail is ordered by last activity and shows the title, so it does go
    // stale — but only the list, never the detail we just seeded.
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists });
    setOptimisticMessage(null);
    // A conflict the other mutation reported is settled once a turn lands, so
    // its warning must not outlive it — otherwise the user is told to approve
    // something they just approved.
    sendMutation.reset();
    resolveMutation.reset();
    if (conversation.id !== conversationId) {
      navigate(`/agent/${conversation.id}`, { replace: true });
    }
  };

  /**
   * Every 409 means this client's copy of the conversation is behind the
   * server's. The pending action lives in that copy, so a stale one leaves the
   * user with an error telling them to approve something the UI isn't showing
   * and no way out but a reload. Refetching turns that dead end into a state
   * they can act on.
   */
  const resyncAfterConflict = (error: unknown) => {
    if (!conversationId) return;
    if (error instanceof HttpError && error.status === 409) {
      void queryClient.invalidateQueries({ queryKey: agentKeys.detail(conversationId) });
    }
  };

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      conversationId ? agentApi.send(conversationId, message) : agentApi.start(message),
    onSuccess: applyConversation,
    onError: (error) => {
      setOptimisticMessage(null);
      resyncAfterConflict(error);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (input: ResolveInput) =>
      agentApi.resolve(input.conversationId, input.toolUseId, input.decision),
    onSuccess: applyConversation,
    onError: resyncAfterConflict,
  });

  const conversation = query.data;
  const pendingAction = conversation?.pendingAction ?? null;
  const isBusy = sendMutation.isPending || resolveMutation.isPending;

  const messages: AgentMessage[] = [...(conversation?.messages ?? [])];
  if (optimisticMessage !== null) {
    messages.push({ role: 'user', text: optimisticMessage, toolCalls: [], toolResults: [] });
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    // The server rejects a turn while an action is unresolved, so don't send one.
    if (!message || isBusy || pendingAction) return;

    setOptimisticMessage(message);
    setDraft('');
    sendMutation.mutate(message);
  };

  const resolve = (decision: ActionDecision) => {
    if (!conversationId || !pendingAction || isBusy) return;
    resolveMutation.mutate({ conversationId, toolUseId: pendingAction.toolUseId, decision });
  };

  const startNewChat = () => {
    setDraft('');
    setOptimisticMessage(null);
    navigate('/agent');
  };

  return {
    messages,
    pendingAction,
    title: conversation?.title ?? 'New conversation',
    draft,
    setDraft,
    /** True only while an existing conversation is being fetched. */
    isLoading: Boolean(conversationId) && query.isPending,
    isLoadError: query.isError,
    isSending: sendMutation.isPending,
    isResolving: resolveMutation.isPending,
    canSend: draft.trim().length > 0 && !isBusy && !pendingAction,
    formError: toFormError(sendMutation.error ?? resolveMutation.error),
    onSubmit,
    approve: () => resolve('approve'),
    reject: () => resolve('reject'),
    startNewChat,
  };
}

/**
 * The server has three distinct 409s and they need different things from the
 * user, so they can't share one sentence. Each is paired with a refetch, so by
 * the time one of these is read the UI already shows the true state.
 */
const CONFLICT_MESSAGES: Record<string, string> = {
  PENDING_ACTION_REQUIRED: 'Approve or reject the request above to keep going.',
  PENDING_ACTION_MISMATCH: 'That request was already handled — this chat is up to date now.',
  CONVERSATION_CONFLICT: 'This conversation changed somewhere else. It has been refreshed.',
};

function toFormError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpError) {
    if (error.status === 409) return CONFLICT_MESSAGES[error.code] ?? error.message;
    if (error.status === 429) return "You're sending messages too quickly. Give it a moment.";
    if (error.status === 502) return 'The assistant is unavailable right now. Try again shortly.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
