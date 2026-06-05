import { useQuery } from '@tanstack/react-query';

import { publishingApi } from '../data/publishing.api';
import { publicationKeys } from '../data/query-keys';
import { isPublicationPending } from '../data/publishing.types';

const POLL_INTERVAL_MS = 2500;

/** A single publication; polls while distribution is in progress. */
export function usePublication(id: string) {
  return useQuery({
    queryKey: publicationKeys.detail(id),
    queryFn: () => publishingApi.get(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isPublicationPending(status) ? POLL_INTERVAL_MS : false;
    },
  });
}
