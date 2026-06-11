import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { videoApi } from '../data/video.api';
import { videoKeys } from '../data/query-keys';

/**
 * Paged list of the user's videos. Tab screens stay mounted in the background
 * (unlike web page navigation), so the list refetches whenever it regains focus.
 */
export function useVideoLibrary(page = 1, limit = 12) {
  const query = useQuery({
    queryKey: videoKeys.list(page, limit),
    queryFn: () => videoApi.list({ page, limit }),
  });

  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return query;
}
