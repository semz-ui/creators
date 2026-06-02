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
});
