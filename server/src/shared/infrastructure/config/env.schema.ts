import { z } from 'zod';

/**
 * Environment schema — the single source of truth for runtime configuration.
 * Kept side-effect free (no process.env read, no exit) so it can be unit
 * tested in isolation. The loading/validation wiring lives in `env.ts`.
 */
export const envSchema = z.object({
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
    .default('dev-generation-callback-secret-change-me'),

  // Connections module
  // Secret used to derive the AES key that encrypts stored OAuth tokens.
  CONNECTIONS_ENC_KEY: z
    .string()
    .min(16, 'CONNECTIONS_ENC_KEY must be at least 16 characters')
    .default('dev-connections-encryption-key-change-me'),
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
    .default('dev-publish-scheduler-secret-change-me'),

  // Rate limiting (Phase 3) — window in seconds, max requests per window per IP.
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  // Stricter tier for auth-sensitive routes (login/register).
  RATE_LIMIT_AUTH_WINDOW: z.coerce.number().int().positive().default(900),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;
