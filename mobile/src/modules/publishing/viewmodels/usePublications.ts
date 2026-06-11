import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { publishingApi } from '../data/publishing.api';
import { publicationKeys } from '../data/query-keys';

/** Paged list of the user's publications; refetches when the tab regains focus. */
export function usePublications(page = 1, limit = 12) {
  const query = useQuery({
    queryKey: publicationKeys.list(page, limit),
    queryFn: () => publishingApi.list({ page, limit }),
  });

  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return query;
}
