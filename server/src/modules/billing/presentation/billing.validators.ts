import { z } from 'zod';

import { CREDIT_PACKS, isCreditPack } from '../domain/credit-packs';

export const topUpSchema = z.object({
  // Only the known, priced packs can be purchased (kept in sync with the
  // frontend CREDIT_PACKS and the payment provider's price map).
  credits: z
    .number()
    .int()
    .refine(isCreditPack, { message: `credits must be one of: ${CREDIT_PACKS.join(', ')}` }),
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
