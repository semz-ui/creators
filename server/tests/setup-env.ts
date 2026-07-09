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
// Never let a developer's real Kling keys leak into the test run — the video
// module would call the live API. Force the stub generator everywhere. Use
// empty strings (not delete) so a `.env` loaded later by dotenv can't refill
// them; empty is falsy, so buildGenerator() falls back to the stub.
process.env.KLING_ACCESS_KEY = '';
process.env.KLING_SECRET_KEY = '';
// Same for Stripe — force the stub payment provider so tests never hit the API.
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = '';
// Same for Google — force the stub OAuth provider so tests never hit Google.
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
// Same for Instagram — force the stub provider/publisher so tests never hit Meta.
process.env.INSTAGRAM_APP_ID = '';
process.env.INSTAGRAM_APP_SECRET = '';
// Blank so the OAuth callback returns JSON (a developer's .env may set a
// frontend redirect URL, which would flip the callback into 302 mode).
process.env.CONNECTIONS_REDIRECT_URL = '';
// Same for Sora/Cloudinary — pin the stub generator (VIDEO_PROVIDER='stub' is a
// valid enum, so dotenv won't override it) and blank the credentials.
process.env.VIDEO_PROVIDER = 'stub';
process.env.OPENAI_API_KEY = '';
process.env.CLOUDINARY_URL = '';
