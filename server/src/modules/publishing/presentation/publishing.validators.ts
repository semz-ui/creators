import { z } from 'zod';

import { PLATFORMS, type Platform } from '@modules/connections/domain/platform';

const platformEnum = z.enum(PLATFORMS as unknown as [Platform, ...Platform[]]);

export const createPublicationSchema = z.object({
  videoId: z.string().min(1),
  platforms: z.array(platformEnum).nonempty(),
  caption: z.string().max(2200).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const listPublicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePublicationBody = z.infer<typeof createPublicationSchema>;
