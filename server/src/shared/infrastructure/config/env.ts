import 'dotenv/config';

import { envSchema, type Env } from './env.schema';

export type { Env };

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
