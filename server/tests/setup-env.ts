/**
 * Runs before every test file (jest `setupFiles`), before the module graph is
 * imported. Guarantees the config module has valid values so importing it never
 * triggers the fail-fast `process.exit`. Tests that need a real backing service
 * (e.g. mongodb-memory-server) override the relevant value at runtime.
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ??= 'silent';
process.env.MONGO_URI ??= 'mongodb://localhost:27017/reelo-test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789-abcdefghij';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789-abcdefghij';
// Generous rate limits so functional tests aren't throttled; the rate-limit
// tests construct their own limiters with small limits to verify throttling.
process.env.RATE_LIMIT_MAX ??= '100000';
process.env.RATE_LIMIT_AUTH_MAX ??= '100000';
