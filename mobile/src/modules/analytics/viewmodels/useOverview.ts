import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../data/analytics.api';
import { analyticsKeys } from '../data/query-keys';

/** Account-level analytics overview. */
export function useOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview,
    queryFn: analyticsApi.getOverview,
  });
}
