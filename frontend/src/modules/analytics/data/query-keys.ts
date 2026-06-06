export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: ['analytics', 'overview'] as const,
  video: (id: string) => ['analytics', 'video', id] as const,
};
