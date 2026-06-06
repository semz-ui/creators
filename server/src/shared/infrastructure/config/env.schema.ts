import { z } from 'zod';

/**
 * Convenience secrets used as defaults in development/test so the app boots
 * without a full `.env`. They are REJECTED in production (see the refinement at
 * the bottom of the schema) so a misconfigured deploy fails fast instead of
 * running with a publicly-known secret.
 */
const DEV_DEFAULT_SECRETS = {
  GENERATION_CALLBACK_SECRET: 'dev-generation-callback-secret-change-me',
  CONNECTIONS_ENC_KEY: 'dev-connections-encryption-key-change-me',
  PUBLISH_SCHEDULER_SECRET: 'dev-publish-scheduler-secret-change-me',
  PAYMENT_WEBHOOK_SECRET: 'dev-payment-webhook-secret-change-me',
} as const;

/**
 * Environment schema — the single source of truth for runtime configuration.
 * Kept side-effect free (no process.env read, no exit) so it can be unit
 * tested in isolation. The loading/validation wiring lives in `env.ts`.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),

    // Comma-separated origins -> string[]
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),

    // When true, Express trusts X-Forwarded-* so req.ip reflects the real client
    // behind a proxy/load balancer (important for correct rate-limit keying).
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    // Auth / JWT — consumed in Phase 1.
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),

    // Caching (Phase 2) — default TTL in seconds for cache-aside reads.
    CACHE_DEFAULT_TTL: z.coerce.number().int().positive().default(300),

    // Video module — shared secret the AI provider presents on the generation callback.
    GENERATION_CALLBACK_SECRET: z
      .string()
      .min(16, 'GENERATION_CALLBACK_SECRET must be at least 16 characters')
      .default(DEV_DEFAULT_SECRETS.GENERATION_CALLBACK_SECRET),

    // Kling AI video generator (official API). When both keys are set the
    // KlingVideoGenerator is wired in; otherwise the app uses the stub.
    KLING_ACCESS_KEY: z.string().optional(),
    KLING_SECRET_KEY: z.string().optional(),
    KLING_BASE_URL: z.string().url().default('https://api-singapore.klingai.com'),
    KLING_MODEL: z.string().default('kling-v1'),
    KLING_MODE: z.enum(['std', 'pro']).default('std'),
    KLING_ASPECT_RATIO: z.enum(['16:9', '9:16', '1:1']).default('16:9'),

    // Connections module
    // Secret used to derive the AES key that encrypts stored OAuth tokens.
    CONNECTIONS_ENC_KEY: z
      .string()
      .min(16, 'CONNECTIONS_ENC_KEY must be at least 16 characters')
      .default(DEV_DEFAULT_SECRETS.CONNECTIONS_ENC_KEY),
    // TTL (seconds) for one-time OAuth state tokens.
    OAUTH_STATE_TTL: z.coerce.number().int().positive().default(600),
    // Public base URL used to build the OAuth redirect_uri.
    PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
    // If set, the OAuth callback 302-redirects here (with ?status=); otherwise returns JSON.
    CONNECTIONS_REDIRECT_URL: z.string().default(''),

    // Publishing module — shared secret a scheduler presents to run due publications.
    PUBLISH_SCHEDULER_SECRET: z
      .string()
      .min(16, 'PUBLISH_SCHEDULER_SECRET must be at least 16 characters')
      .default(DEV_DEFAULT_SECRETS.PUBLISH_SCHEDULER_SECRET),

    // Billing module
    // Free credits granted to a new account on first use.
    INITIAL_FREE_CREDITS: z.coerce.number().int().nonnegative().default(100),
    // Flat credit cost charged per video generation.
    VIDEO_CREDIT_COST: z.coerce.number().int().positive().default(10),
    // Shared secret the payment provider presents on the top-up webhook.
    PAYMENT_WEBHOOK_SECRET: z
      .string()
      .min(16, 'PAYMENT_WEBHOOK_SECRET must be at least 16 characters')
      .default(DEV_DEFAULT_SECRETS.PAYMENT_WEBHOOK_SECRET),

    // Rate limiting (Phase 3) — window in seconds, max requests per window per IP.
    RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    // Stricter tier for auth-sensitive routes (login/register).
    RATE_LIMIT_AUTH_WINDOW: z.coerce.number().int().positive().default(900),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((env, ctx) => {
    // Outside production the dev defaults are fine. In production a secret left
    // at its publicly-known default is a misconfiguration — fail fast.
    if (env.NODE_ENV !== 'production') return;
    for (const [key, devValue] of Object.entries(DEV_DEFAULT_SECRETS)) {
      if (env[key as keyof typeof DEV_DEFAULT_SECRETS] === devValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be set to a non-default value in production`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;
