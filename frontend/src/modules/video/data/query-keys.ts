/** Query keys for the video module. */
export const videoKeys = {
  all: ['videos'] as const,
  list: (page: number, limit: number) => ['videos', 'list', { page, limit }] as const,
  detail: (id: string) => ['videos', 'detail', id] as const,
  providers: ['videos', 'providers'] as const,
};
