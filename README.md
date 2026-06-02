# Creators

[![CI](https://github.com/semz-ui/creators/actions/workflows/ci.yml/badge.svg)](https://github.com/semz-ui/creators/actions/workflows/ci.yml)

Monorepo for **Reelo** — an AI video creator platform (prompt → AI-generated video → auto-publish to FB / IG / YouTube / TikTok).

## Structure

```
creator/
└── server/   # Backend API — Express, TypeScript, onion architecture, modular monolith
```

## Backend (`server/`)

- **Framework:** Express.js + TypeScript (strict)
- **Architecture:** Onion (Domain → Application → Infrastructure → Presentation), modular monolith
- **Database:** MongoDB (Mongoose)
- **Cache / sessions / rate-limit store:** Redis
- **Auth:** JWT access + rotating refresh tokens

See [`server/`](./server) for setup and scripts.

### Running locally

**With Docker (recommended)** — starts the API, MongoDB, and Redis together:

```bash
docker compose up --build
# API on http://localhost:4000  ·  health: /health  ·  readiness: /health/ready
```

**Without Docker** — run Mongo + Redis yourself, then:

```bash
cd server
cp .env.example .env   # adjust secrets
npm install
npm run dev
```

### Quality & testing

Run from `server/`:

| Command | Purpose |
| ------- | ------- |
| `npm run lint` / `npm run format:check` | ESLint + Prettier |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Full Jest suite |
| `npm run test:unit` / `test:integration` / `test:e2e` | Run one layer |
| `npm run test:cov` | Tests with coverage |
| `npm run build` | Compile to `dist/` |

- **Unit** — pure logic (domain errors, env schema, cache service, async handler).
- **Integration** — MongoDB via `mongodb-memory-server`; cache service via `ioredis-mock`.
- **E2E** — the assembled Express app driven with `supertest`.

CI (GitHub Actions) runs format → lint → typecheck → test (coverage) → build on every push to `main` and every PR.

## Roadmap

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 0 | Foundation — tooling, config, Mongo/Redis infra, app + server bootstrap, health checks | ✅ |
| 1 | Authentication — register, login, JWT access + rotating refresh tokens | ✅ |
| 2 | Redis caching (cache-aside, generalized) | ✅ |
| 3 | Rate limiting (Redis-backed, tiered) | ✅ |
| 4 | Hardening & DX — logging, tests, Docker | ✅ |

Each phase is delivered as a pull request.

## Caching (Phase 2)

Cross-cutting cache-aside caching backed by Redis:

- `ICacheService` (port) + `RedisCacheService` (JSON-encoded, TTL-aware, `getOrSet` helper).
- `cacheKey(namespace, ...parts)` for consistent, namespaced keys (e.g. `user:<id>`).
- Applied via a `CachedUserRepository` decorator over the Mongo repository: `findById`
  (the auth-guard / `/me` hot read) is cache-aside; `save` writes through and invalidates.
- Default TTL via `CACHE_DEFAULT_TTL` (seconds).

## Rate limiting (Phase 3)

Redis-backed (fixed-window) so limits hold across instances. Tiered:

- **Global** per-IP limit across `/api/v1/*` (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW`). `/health` is exempt.
- **Strict** per-IP limit on credential routes (`/auth/register`, `/auth/login`) to blunt brute force (`RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_AUTH_WINDOW`).

Responses carry `RateLimit-Limit`/`-Remaining`/`-Reset`; a breach returns `429` with `Retry-After`. The limiter sits behind an `IRateLimiter` port, so the backend is swappable.

## Auth API (Phase 1)

Base path `/api/v1/auth`:

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/register` | — | Create account, returns `{ user, accessToken, refreshToken }` |
| POST | `/login` | — | Authenticate, returns a new token pair |
| POST | `/refresh` | refresh token (body) | Rotate tokens; reused/replayed tokens revoke the session family |
| POST | `/logout` | refresh token (body) | Revoke the presented refresh token (idempotent) |
| POST | `/logout-all` | Bearer access token | Revoke every session for the user |
| GET | `/me` | Bearer access token | Current user profile |

Access tokens are short-lived JWTs; refresh tokens are long-lived, rotated on every use, and tracked in Redis with reuse detection.

> Deferred to a Phase 1 follow-up: email verification and password reset.
