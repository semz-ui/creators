export const agentKeys = {
  all: ['agent'] as const,
  /** Prefix for every list page — invalidate this without touching details. */
  lists: ['agent', 'list'] as const,
  list: (page: number, limit: number) => ['agent', 'list', { page, limit }] as const,
  detail: (id: string) => ['agent', 'detail', id] as const,
};
