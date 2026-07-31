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
    if (conversation.id !== conversationId) {
      navigate(`/agent/${conversation.id}`, { replace: true });
    }
  };

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      conversationId ? agentApi.send(conversationId, message) : agentApi.start(message),
    onSuccess: applyConversation,
    onError: () => setOptimisticMessage(null),
  });

  const resolveMutation = useMutation({
    mutationFn: (input: ResolveInput) =>
      agentApi.resolve(input.conversationId, input.toolUseId, input.decision),
    onSuccess: applyConversation,
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

function toFormError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpError) {
    if (error.status === 409) return 'Approve or reject the pending action first.';
    if (error.status === 429) return "You're sending messages too quickly. Give it a moment.";
    if (error.status === 502) return 'The assistant is unavailable right now. Try again shortly.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
