import { useQuery } from '@tanstack/react-query';

import { agentApi } from '../data/agent.api';
import { agentKeys } from '../data/query-keys';

/**
 * One conversation. Unlike a publication there is nothing to poll for — a
 * conversation only changes when this client sends a turn or resolves an
 * action, and both hand back the updated conversation.
 */
export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: agentKeys.detail(id ?? ''),
    queryFn: () => agentApi.get(id as string),
    enabled: Boolean(id),
  });
}
