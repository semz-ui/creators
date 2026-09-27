import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { HttpError } from '@/shared/data/http-error';

import { agentApi } from '../data/agent.api';
import { agentKeys } from '../data/query-keys';

/**
 * Removes a conversation from the history rail.
 *
 * The server soft-deletes, so nothing is destroyed — but the chat is gone for
 * the user, and leaving the deleted one on screen would 404 on the next
 * reload, so the open conversation is navigated away from.
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const forget = (id: string) => {
    queryClient.removeQueries({ queryKey: agentKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists });
    if (id === conversationId) navigate('/agent', { replace: true });
  };

  const mutation = useMutation({
    mutationFn: (id: string) => agentApi.remove(id),
    onSuccess: (_result, id) => forget(id),
    onError: (error, id) => {
      // Already gone — deleted from another tab, most likely. The row should
      // still disappear; treating this as a failure would only strand it.
      if (error instanceof HttpError && error.status === 404) forget(id);
    },
  });

  return {
    deleteConversation: mutation.mutate,
    /** The row being deleted, so only that one shows the pending state. */
    deletingId: mutation.isPending ? mutation.variables : null,
    error: toDeleteError(mutation.error),
  };
}

function toDeleteError(error: unknown): string | null {
  if (!error) return null;
  // A 404 is handled as success, so anything left here is a real failure.
  if (error instanceof HttpError && error.status === 404) return null;
  return "That chat couldn't be deleted. Try again.";
}
