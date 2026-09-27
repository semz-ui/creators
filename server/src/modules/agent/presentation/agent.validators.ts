import { z } from 'zod';

export const MESSAGE_MAX_LENGTH = 4000;

export const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});

export const resolveActionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
});

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SendMessageBody = z.infer<typeof sendMessageSchema>;
export type ResolveActionBody = z.infer<typeof resolveActionSchema>;
