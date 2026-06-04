# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Reelo** — backend API for an AI video creator platform (prompt → AI-generated video → auto-publish to FB/IG/YouTube/TikTok). The repo is a monorepo; today it contains only `server/` (Express + TypeScript). Work is delivered phase-by-phase, one PR per phase (see README roadmap).

## Commands

All commands run from `server/`:

```bash
npm run dev            # tsx watch — hot-reload dev server
npm run build          # tsc + tsc-alias → dist/ (resolves @ path aliases)
npm start              # run compiled dist/server.js

npm run typecheck      # tsc --noEmit (strict)
npm run lint           # eslint src + tests   (lint:fix to autofix)
npm run format:check   # prettier --check     (format to write)

npm test               # full Jest suite
npm run test:unit      # tests/unit  — pure logic, no I/O
npm run test:integration  # tests/integration — real Mongo (mongodb-memory-server) + Redis (ioredis-mock)
npm run test:e2e       # tests/e2e — assembled app via supertest
npm run test:cov       # coverage
npx jest path/to/file.test.ts          # single file
npx jest -t "partial test name"        # single test by name
```

CI (`.github/workflows/ci.yml`) runs format → lint → typecheck → test (coverage) → build on every push to `main` and every PR. Run these locally before pushing.

**First `test:integration`/`test:e2e` run downloads a MongoDB binary** (mongodb-memory-server); the 60s Jest `testTimeout` accommodates this.

**Run the full stack (API + Mongo + Redis):** `docker compose up --build` from the repo root (API on `:4000`). Without Docker, run Mongo + Redis yourself, `cp .env.example .env`, `npm install`, `npm run dev`.

## Architecture

Onion architecture as a **modular monolith**. Each feature is a self-contained module under `src/modules/<feature>/` with four layers; dependencies point inward only (`domain` knows nothing of `infrastructure`/`presentation`).

```
src/
  modules/<feature>/
    domain/          # entities, value-objects, ports (interfaces), domain errors — no framework imports
    application/     # use cases (one class per use case) + DTOs; orchestrate domain via ports
    infrastructure/  # concrete adapters implementing domain ports (Mongo, Redis, bcrypt, JWT)
    presentation/    # Express controllers, routers, validators, guards
    <feature>.module.ts   # module composition root: wires concrete adapters into use cases, returns a Router
  shared/            # cross-cutting: config, logging, cache, rate-limit, db, presentation middleware, domain errors
  container/index.ts # app composition root: builds modules, exposes routers + global middleware
  app.ts             # assembles Express (middleware → routers → error pipeline); NO side effects (no connect/listen)
  server.ts          # bootstrap: connects Mongo+Redis, listens, graceful shutdown
```

### Dependency injection / composition

There is no DI framework. Wiring is manual and explicit, top-down:

- `buildContainer(deps)` (`container/index.ts`) is the app composition root. It builds each module via `build<Feature>Module(...)` and returns their routers + shared middleware.
- `createApp(container = buildContainer())` accepts a pre-built container so **tests inject fakes** (e.g. an `ioredis-mock` client) without touching production singletons. `createApp` does no I/O.
- Adapters are passed by interface (port), never imported concretely by use cases. To swap an implementation, change the wiring in the module file — not the use cases.

### Ports & adapters convention

Domain ports are `I`-prefixed interfaces in `domain/ports/` (e.g. `IUserRepository`, `ITokenService`). Infrastructure provides the concrete class (e.g. `MongoUserRepository`, `JwtTokenService`). Use cases depend only on the port. This is what makes Mongo/Redis/JWT swappable and tests trivial to fake.

### Cross-cutting decorators

Caching is applied as a **decorator over a port**, not baked into the repository. `CachedUserRepository` wraps `MongoUserRepository` + `ICacheService`: `findById` is cache-aside (the hot auth-guard/`/me` read), `save` writes through and invalidates, `findByEmail`/`existsByEmail` delegate uncached. Follow this pattern for new caching rather than embedding cache calls in adapters.

### Config

**Never read `process.env` directly.** Import `env` from `@shared/infrastructure/config/env` — it's a Zod-validated, frozen object. Invalid config fails fast (`process.exit(1)`) at startup. Add new vars to `env.schema.ts`, `.env.example`, and `tests/setup-env.ts`. Helpers: `isProduction`, `isTest`.

### Errors

Throw subclasses of `AppError` (`@shared/domain/errors`: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ConflictError`, `TooManyRequestsError`, …) plus module-specific errors. The global `errorHandler` (last middleware in `app.ts`) maps `AppError` → its `statusCode`/`code`, `ZodError` → 422, and anything else → 500 (internals hidden in production). Every error response carries a `requestId`. Don't `res.status(500)` by hand — throw and let the pipeline handle it.

### Path aliases

`@modules/*`, `@shared/*`, `@container/*` (defined in `tsconfig.json`, mirrored in `jest.config.js`). The build step runs `tsc-alias` to rewrite them in `dist/`.

## Notable behaviors

- **Refresh-token rotation with reuse detection** (`refresh-tokens.usecase.ts`): refresh tokens are single-use and rotated within a "family". A token that verifies but is absent from the Redis store is a replay → the **entire family is revoked**. Preserve this security property when touching auth.
- **Health:** `/health` is liveness (always exempt from rate limiting); `/health/ready` checks Mongo + Redis and returns 503 if degraded.
- **Rate limiting** is Redis-backed (fixed-window) so limits hold across instances, behind an `IRateLimiter` port. Global per-IP limit on `/api/v1/*`; a stricter tier on `/auth/register` + `/auth/login`. When `TRUST_PROXY=true`, `req.ip` (the rate-limit key) comes from `X-Forwarded-*`.

## Conventions

- TypeScript is **strict** with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`. Prefix intentionally-unused vars/args with `_`.
- `no-console` and `no-explicit-any` are warnings (errors off in tests). Use the pino `logger` from `@shared/infrastructure/logging`, not `console`.
- One use case per class with an `execute(...)` method (auth uses `register`/`login`/`refresh`/etc. on the controller, each delegating to a use case class).
- Async route handlers wrap with `asyncHandler` so rejections reach the error pipeline.
