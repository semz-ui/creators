import { apiClient } from '@/shared/data/api-client';

import type { ActionDecision, Conversation, ConversationPage } from './agent.types';

const BASE = '/api/v1/agent/conversations';

export const agentApi = {
  /** Starts a new conversation and runs the first turn. */
  start: (message: string) => apiClient.post<Conversation>(BASE, { message }),

  /** Past conversations, most recently active first. */
  list: (params: { page: number; limit: number }) =>
    apiClient.get<ConversationPage>(`${BASE}?page=${params.page}&limit=${params.limit}`),

  /** Runs another turn on an existing conversation. */
  send: (id: string, message: string) =>
    apiClient.post<Conversation>(`${BASE}/${id}/messages`, { message }),

  /** Approves or rejects the action the conversation is paused on. */
  resolve: (id: string, toolUseId: string, decision: ActionDecision) =>
    apiClient.post<Conversation>(`${BASE}/${id}/actions/${toolUseId}`, { decision }),

  get: (id: string) => apiClient.get<Conversation>(`${BASE}/${id}`),
};
