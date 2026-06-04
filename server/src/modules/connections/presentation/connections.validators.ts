import { z } from 'zod';

export const oauthCallbackQuerySchema = z.object({
  state: z.string().min(1),
  code: z.string().min(1),
});

export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
