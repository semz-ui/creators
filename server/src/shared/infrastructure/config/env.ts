import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment schema — the single source of truth for runtime configuration.
 * Validated once at process start; the app fails fast if anything is missing
 * or malformed so we never boot into a half-configured state.
 */
const envSchema = z.object({
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

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Auth / JWT — consumed in Phase 1.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`❌ Invalid environment configuration:\n${issues}\n`);
    process.exit(1);
  }

  return parsed.data;
}

/** Validated, frozen configuration. Import this everywhere instead of process.env. */
export const env: Readonly<Env> = Object.freeze(loadEnv());

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
