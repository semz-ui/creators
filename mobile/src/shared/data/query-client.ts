import { QueryClient } from '@tanstack/react-query';

import { HttpError } from './http-error';

/** App-wide TanStack Query client. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry auth/validation errors; retry transient ones once.
        if (error instanceof HttpError && error.status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});
