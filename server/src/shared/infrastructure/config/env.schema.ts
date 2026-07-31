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

    // Password reset — TTL (seconds) for one-time reset tokens, and the
    // frontend page the emailed link points at (token appended as ?token=).
    PASSWORD_RESET_TTL: z.coerce.number().int().positive().default(900),
    PASSWORD_RESET_URL: z.string().url().default('http://localhost:3000/reset-password'),
    // Resend — set RESEND_API_KEY to send real emails (else the stub sender
    // logs reset links). EMAIL_FROM must be a verified sender in production.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('Reelo <onboarding@resend.dev>'),

    // Caching (Phase 2) — default TTL in seconds for cache-aside reads.
    CACHE_DEFAULT_TTL: z.coerce.number().int().positive().default(300),

    // Outbound HTTP timeouts (ms) for the social integration adapters, so a hung
    // upstream can't block a request or the publishing scheduler indefinitely.
    // API/metadata calls use the first; video download/upload uses the second.
    HTTP_CLIENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    HTTP_MEDIA_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),

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

    // OpenAI Sora video generator. Sora returns authenticated binary, so its
    // output is uploaded to Cloudinary (CLOUDINARY_URL required when Sora is used).
    OPENAI_API_KEY: z.string().optional(),
    SORA_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
    SORA_MODEL: z.string().default('sora-2'),
    SORA_SIZE: z.string().default('1280x720'),
    // OpenAI TTS model used to synthesize optional video narration.
    TTS_MODEL: z.string().default('gpt-4o-mini-tts'),
    CLOUDINARY_URL: z.string().optional(),
    // Explicit generator selection; when unset (or blank, e.g. an empty
    // docker-compose passthrough) the provider is auto-detected from configured
    // credentials (sora → kling → stub).
    VIDEO_PROVIDER: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.enum(['sora', 'kling', 'stub']).optional(),
    ),

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
    // Google OAuth for the 'youtube' platform. When both are set the real
    // Google provider is wired in; otherwise the stub is used. GOOGLE_CLIENT_ID
    // is also the accepted `aud` for Sign in with Google ID tokens.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // Privacy of videos published to YouTube. Unverified Google apps are
    // forced to 'private' by YouTube regardless; keep the safe default.
    YOUTUBE_PRIVACY_STATUS: z.enum(['private', 'unlisted', 'public']).default('private'),
    // Instagram API with Instagram Login ("Business Login") for the
    // 'instagram' platform. When both are set the real provider + Reels
    // publisher are wired in. These are the Instagram-product app id/secret,
    // NOT the parent Meta app id.
    INSTAGRAM_APP_ID: z.string().optional(),
    INSTAGRAM_APP_SECRET: z.string().optional(),
    // TikTok Login Kit + Content Posting API for the 'tiktok' platform. When
    // both are set the real provider + Direct Post publisher are wired in.
    // TikTok calls these client_key/client_secret (not client_id).
    TIKTOK_CLIENT_KEY: z.string().optional(),
    TIKTOK_CLIENT_SECRET: z.string().optional(),
    // Privacy of videos posted to TikTok. Until the app passes TikTok's audit,
    // posts are forced to SELF_ONLY regardless; the publisher honors whatever
    // the creator_info query allows, so keep the safe default.
    TIKTOK_PRIVACY_LEVEL: z
      .enum(['SELF_ONLY', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'PUBLIC_TO_EVERYONE'])
      .default('SELF_ONLY'),

    // Publishing module — shared secret a scheduler presents to run due publications.
    PUBLISH_SCHEDULER_SECRET: z
      .string()
      .min(16, 'PUBLISH_SCHEDULER_SECRET must be at least 16 characters')
      .default(DEV_DEFAULT_SECRETS.PUBLISH_SCHEDULER_SECRET),

    // Agent module — the conversational assistant that drives generation and
    // publishing through tool calls. Set ANTHROPIC_API_KEY to run on the real
    // model; otherwise a deterministic stub model is wired in, so the whole
    // chat flow works locally and on the public demo for free.
    ANTHROPIC_API_KEY: z.string().optional(),
    AGENT_MODEL: z.string().default('claude-sonnet-5'),
    // Thinking depth / overall token spend. The main cost-latency lever.
    AGENT_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('medium'),
    // Thinking and the visible reply share this budget on Claude Sonnet 5, so
    // it needs headroom well beyond the length of the reply itself.
    AGENT_MAX_TOKENS: z.coerce.number().int().positive().default(8192),
    // Hard cap on model <-> tool round trips within a single turn.
    AGENT_MAX_ITERATIONS: z.coerce.number().int().positive().default(8),
    // Trailing slice of conversation history replayed to the model each turn.
    AGENT_MAX_HISTORY_MESSAGES: z.coerce.number().int().positive().default(40),

    // Billing module
    // Free credits granted to a new account on first use.
    INITIAL_FREE_CREDITS: z.coerce.number().int().nonnegative().default(100),
    // Flat credit cost charged per video generation.
    VIDEO_CREDIT_COST: z.coerce.number().int().positive().default(10),
    // Shared secret the payment provider presents on the top-up webhook (stub provider).
    PAYMENT_WEBHOOK_SECRET: z
      .string()
      .min(16, 'PAYMENT_WEBHOOK_SECRET must be at least 16 characters')
      .default(DEV_DEFAULT_SECRETS.PAYMENT_WEBHOOK_SECRET),

    // Stripe — set STRIPE_SECRET_KEY to take real payments via Stripe Checkout
    // (else the stub provider is used). STRIPE_WEBHOOK_SECRET is then required.
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_SUCCESS_URL: z.string().url().default('http://localhost:3000/billing?topup=success'),
    STRIPE_CANCEL_URL: z.string().url().default('http://localhost:3000/billing?topup=cancelled'),

    // Rate limiting (Phase 3) — window in seconds, max requests per window per IP.
    RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    // Stricter tier for auth-sensitive routes (login/register).
    RATE_LIMIT_AUTH_WINDOW: z.coerce.number().int().positive().default(900),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
    // Stricter tier for agent turns — each one can fan out into model calls,
    // a paid generation, and a publish.
    RATE_LIMIT_AGENT_WINDOW: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_AGENT_MAX: z.coerce.number().int().positive().default(20),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((env, ctx) => {
    // Sora needs both an OpenAI key and Cloudinary to store its binary output.
    // Required when Sora is selected explicitly or implied by an OpenAI key.
    const wantsSora = env.VIDEO_PROVIDER === 'sora' || Boolean(env.OPENAI_API_KEY);
    if (wantsSora && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OPENAI_API_KEY'],
        message: 'OPENAI_API_KEY is required when VIDEO_PROVIDER is "sora"',
      });
    }
    if (wantsSora && !env.CLOUDINARY_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CLOUDINARY_URL'],
        message: 'CLOUDINARY_URL is required to store Sora-generated videos',
      });
    }

    // Google OAuth credentials only work as a pair — catch half-configured deploys.
    if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GOOGLE_CLIENT_SECRET'],
        message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together',
      });
    }

    // Instagram credentials only work as a pair — catch half-configured deploys.
    if (Boolean(env.INSTAGRAM_APP_ID) !== Boolean(env.INSTAGRAM_APP_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['INSTAGRAM_APP_SECRET'],
        message: 'INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET must be set together',
      });
    }

    // TikTok credentials only work as a pair — catch half-configured deploys.
    if (Boolean(env.TIKTOK_CLIENT_KEY) !== Boolean(env.TIKTOK_CLIENT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TIKTOK_CLIENT_SECRET'],
        message: 'TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET must be set together',
      });
    }

    // Enabling Stripe requires its webhook signing secret to verify callbacks.
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_WEBHOOK_SECRET'],
        message: 'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set',
      });
    }

    // In production with Stripe enabled, the post-checkout redirect URLs must be
    // real public URLs — the localhost defaults would strand real customers.
    if (env.STRIPE_SECRET_KEY && env.NODE_ENV === 'production') {
      for (const key of ['STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL'] as const) {
        if (/\blocalhost\b|127\.0\.0\.1/.test(env[key])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} must be a public URL (not localhost) when Stripe is enabled in production`,
          });
        }
      }
    }

    // In production with real email enabled, the reset link must be a public
    // URL — the localhost default would email dead links to real users.
    if (
      env.RESEND_API_KEY &&
      env.NODE_ENV === 'production' &&
      /\blocalhost\b|127\.0\.0\.1/.test(env.PASSWORD_RESET_URL)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PASSWORD_RESET_URL'],
        message:
          'PASSWORD_RESET_URL must be a public URL (not localhost) when Resend is enabled in production',
      });
    }

    // Likewise the sender: resend.dev is Resend's sandbox domain and only
    // delivers to the account owner. Left at the default, real users would get
    // a 202 but never an email (the send failure is deliberately swallowed).
    if (
      env.RESEND_API_KEY &&
      env.NODE_ENV === 'production' &&
      /\bresend\.dev\b/.test(env.EMAIL_FROM)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EMAIL_FROM'],
        message:
          'EMAIL_FROM must use a domain verified in Resend (not the resend.dev sandbox) when Resend is enabled in production',
      });
    }

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
