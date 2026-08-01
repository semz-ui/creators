import { useQuery } from '@tanstack/react-query';

import { agentApi } from '../data/agent.api';
import { agentKeys } from '../data/query-keys';

const DEFAULT_LIMIT = 30;

/** Past conversations for the history rail, most recently active first. */
export function useConversations(page = 1, limit = DEFAULT_LIMIT) {
  return useQuery({
    queryKey: agentKeys.list(page, limit),
    queryFn: () => agentApi.list({ page, limit }),
  });
}
