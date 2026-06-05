import { useQuery } from '@tanstack/react-query';

import { publishingApi } from '../data/publishing.api';
import { publicationKeys } from '../data/query-keys';

/** Paged list of the user's publications. */
export function usePublications(page = 1, limit = 12) {
  return useQuery({
    queryKey: publicationKeys.list(page, limit),
    queryFn: () => publishingApi.list({ page, limit }),
  });
}
