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
