import { envSchema } from '@shared/infrastructure/config/env.schema';

const validInput = {
  MONGO_URI: 'mongodb://localhost:27017/reelo',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('envSchema', () => {
  it('parses a valid environment and applies defaults', () => {
    const result = envSchema.parse(validInput);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(4000);
    expect(result.JWT_ACCESS_TTL).toBe('15m');
    expect(result.JWT_REFRESH_TTL).toBe('7d');
    expect(result.LOG_LEVEL).toBe('info');
  });

  it('coerces PORT from string to number', () => {
    const result = envSchema.parse({ ...validInput, PORT: '8080' });
    expect(result.PORT).toBe(8080);
  });

  it('applies Kling defaults and leaves the keys optional', () => {
    const result = envSchema.parse(validInput);
    expect(result.KLING_ACCESS_KEY).toBeUndefined();
    expect(result.KLING_SECRET_KEY).toBeUndefined();
    expect(result.KLING_BASE_URL).toBe('https://api-singapore.klingai.com');
    expect(result.KLING_MODEL).toBe('kling-v1');
    expect(result.KLING_MODE).toBe('std');
    expect(result.KLING_ASPECT_RATIO).toBe('16:9');
  });

  it('rejects an invalid Kling mode', () => {
    const result = envSchema.safeParse({ ...validInput, KLING_MODE: 'turbo' });
    expect(result.success).toBe(false);
  });

  it('requires STRIPE_WEBHOOK_SECRET when STRIPE_SECRET_KEY is set', () => {
    const result = envSchema.safeParse({ ...validInput, STRIPE_SECRET_KEY: 'sk_test_x' });
    expect(result.success).toBe(false);
  });

  it('allows the localhost Stripe redirect defaults outside production', () => {
    const result = envSchema.safeParse({
      ...validInput,
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
    });
    expect(result.success).toBe(true); // NODE_ENV defaults to development
  });

  it('rejects localhost Stripe redirect URLs in production', () => {
    const result = envSchema.safeParse({
      ...validInput,
      NODE_ENV: 'production',
      STRIPE_SECRET_KEY: 'sk_live_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
      // STRIPE_SUCCESS_URL/CANCEL_URL left at their localhost defaults
      // (plus the other prod secrets so only the URL issues surface)
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      GENERATION_CALLBACK_SECRET: 'x'.repeat(16),
      CONNECTIONS_ENC_KEY: 'x'.repeat(16),
      PUBLISH_SCHEDULER_SECRET: 'x'.repeat(16),
      PAYMENT_WEBHOOK_SECRET: 'x'.repeat(16),
    });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL']));
  });

  it('accepts public Stripe redirect URLs in production', () => {
    const result = envSchema.safeParse({
      ...validInput,
      NODE_ENV: 'production',
      STRIPE_SECRET_KEY: 'sk_live_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
      STRIPE_SUCCESS_URL: 'https://app.reelo.example/billing?topup=success',
      STRIPE_CANCEL_URL: 'https://app.reelo.example/billing?topup=cancelled',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      GENERATION_CALLBACK_SECRET: 'x'.repeat(16),
      CONNECTIONS_ENC_KEY: 'x'.repeat(16),
      PUBLISH_SCHEDULER_SECRET: 'x'.repeat(16),
      PAYMENT_WEBHOOK_SECRET: 'x'.repeat(16),
    });
    expect(result.success).toBe(true);
  });

  it('splits CORS_ORIGINS into a trimmed array', () => {
    const result = envSchema.parse({
      ...validInput,
      CORS_ORIGINS: 'http://a.com, http://b.com ,',
    });
    expect(result.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });

  it('rejects secrets shorter than 32 characters', () => {
    const result = envSchema.safeParse({ ...validInput, JWT_ACCESS_SECRET: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing MONGO_URI', () => {
    const { MONGO_URI: _omit, ...rest } = validInput;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid NODE_ENV', () => {
    const result = envSchema.safeParse({ ...validInput, NODE_ENV: 'staging' });
    expect(result.success).toBe(false);
  });

  it('coerces TRUST_PROXY from string to boolean (default false)', () => {
    expect(envSchema.parse(validInput).TRUST_PROXY).toBe(false);
    expect(envSchema.parse({ ...validInput, TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(true);
    expect(envSchema.safeParse({ ...validInput, TRUST_PROXY: 'yes' }).success).toBe(false);
  });

  it('allows the dev-default secrets outside production', () => {
    // Defaults are applied and accepted in development.
    expect(envSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects dev-default secrets in production', () => {
    const result = envSchema.safeParse({ ...validInput, NODE_ENV: 'production' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toEqual(
        expect.arrayContaining([
          'PAYMENT_WEBHOOK_SECRET',
          'PUBLISH_SCHEDULER_SECRET',
          'GENERATION_CALLBACK_SECRET',
          'CONNECTIONS_ENC_KEY',
        ]),
      );
    }
  });

  it('accepts production when the secrets are overridden', () => {
    const result = envSchema.safeParse({
      ...validInput,
      NODE_ENV: 'production',
      GENERATION_CALLBACK_SECRET: 'x'.repeat(20),
      CONNECTIONS_ENC_KEY: 'y'.repeat(20),
      PUBLISH_SCHEDULER_SECRET: 'z'.repeat(20),
      PAYMENT_WEBHOOK_SECRET: 'w'.repeat(20),
    });
    expect(result.success).toBe(true);
  });
});
