import { useQuery } from '@tanstack/react-query';

import { authApi } from '../data/auth.api';
import { authKeys } from '../data/query-keys';
import { useSession } from './useSession';

/** Loads the authenticated user from the server (authoritative). */
export function useMe() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled: isAuthenticated,
  });
}
