import { useQuery } from '@tanstack/react-query';

import { publishingApi } from '../data/publishing.api';
import { publicationKeys } from '../data/query-keys';
import { isPublicationPending, type PublicationStatus } from '../data/publishing.types';

const POLL_INTERVAL_MS = 2500;

/** Poll while distribution is in flight; stop on a terminal state. */
export function publicationPollInterval(status: PublicationStatus | undefined): number | false {
  return status && isPublicationPending(status) ? POLL_INTERVAL_MS : false;
}

/** A single publication; polls while distribution is in progress. */
export function usePublication(id: string) {
  return useQuery({
    queryKey: publicationKeys.detail(id),
    queryFn: () => publishingApi.get(id),
    refetchInterval: (query) => publicationPollInterval(query.state.data?.status),
  });
}
