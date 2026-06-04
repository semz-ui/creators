import { z } from 'zod';

export const topUpSchema = z.object({
  credits: z.number().int().positive(),
});

export const paymentWebhookSchema = z.object({
  providerRef: z.string().min(1),
  status: z.enum(['completed', 'failed']),
});

export const ledgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TopUpBody = z.infer<typeof topUpSchema>;
export type PaymentWebhookBody = z.infer<typeof paymentWebhookSchema>;
