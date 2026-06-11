export const publicationKeys = {
  all: ['publications'] as const,
  list: (page: number, limit: number) => ['publications', 'list', { page, limit }] as const,
  detail: (id: string) => ['publications', 'detail', id] as const,
};
