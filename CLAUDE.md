# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Reelo** — AI video studio: prompt → AI-generated video → auto-publish to FB/IG/YouTube/TikTok. The repo is a monorepo with three apps (`server/`, `frontend/`, `mobile/`). Work is delivered phase-by-phase, one PR per phase/module.

## Commands

### Server (`server/`)

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

### Frontend (`frontend/`)

```bash
npm run dev            # Vite dev server → http://localhost:3000
npm run build          # tsc --noEmit + vite build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src + tests
npm run format:check   # prettier --check
npm test               # vitest run
npm run test:cov       # vitest run --coverage
npm run test:e2e       # playwright test
```

### Mobile (`mobile/`)

```bash
npm start              # expo start (press i = iOS simulator, a = Android emulator)
npm run ios / android  # expo start --ios / --android
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm run format:check   # prettier --check
npm test               # jest
npm run test:cov       # jest --coverage
```

### Full stack

```bash
# From repo root — starts nginx LB (:8080), API, MongoDB (replica set), Redis:
docker compose up --build
# Scale horizontally:
docker compose up --build --scale server=3
```

CI (GitHub Actions, path-filtered per app) runs: format → lint → typecheck → test (coverage) → build.

**First `test:integration`/`test:e2e` run downloads a MongoDB binary** (mongodb-memory-server); the 60s Jest `testTimeout` accommodates this.

## Architecture

### Server

Onion architecture as a **modular monolith**. Each feature is a self-contained module under `src/modules/<feature>/` with four layers; dependencies point inward only (`domain` knows nothing of `infrastructure`/`presentation`).

```
src/
  modules/<feature>/
    domain/          # entities, value-objects, ports (interfaces), domain errors — no framework imports
    application/     # use cases (one class per use case) + DTOs; orchestrate domain via ports
    infrastructure/  # concrete adapters implementing domain ports (Mongo, Redis, bcrypt, JWT, Cloudinary, …)
    presentation/    # Express controllers, routers, validators, guards, upload middleware
    <feature>.module.ts   # composition root: wires adapters → use cases, returns a Router
  shared/            # cross-cutting: config, logging, cache, rate-limit, db, middleware, domain errors
  container/index.ts # app composition root: builds modules, exposes routers + global middleware
  app.ts             # assembles Express (middleware → routers → error pipeline); NO side effects
  server.ts          # bootstrap: connects Mongo+Redis, listens, graceful shutdown
```

Modules: `auth`, `video`, `connections`, `publishing`, `analytics`, `billing`, `agent`.

#### Dependency injection / composition

No DI framework — wiring is manual and explicit:

- `buildContainer(deps)` (`container/index.ts`) builds each module via `build<Feature>Module(...)` and returns routers + shared middleware.
- `createApp(container = buildContainer())` accepts a pre-built container so **tests inject fakes** without touching production singletons. `createApp` does no I/O.
- Adapters are passed by interface (port), never imported concretely by use cases.

#### Ports & adapters convention

Domain ports are `I`-prefixed interfaces in `domain/ports/` (e.g. `IUserRepository`, `IVideoStorage`, `ISocialPublisher`). Infrastructure provides the concrete class. Use cases depend only on the port.

**Stub vs. real providers:** Every external integration (AI generators, social OAuth, publishers, payments, metrics, video storage) is behind a port. The real adapter activates when its credentials are in `.env`; otherwise a stub runs so the full product works locally for free. To add a new integration, implement the port, add a credential check in the module wiring, fall back to the stub.

#### Cross-cutting decorators

Caching is a **decorator over a port**, not baked into repositories. `CachedUserRepository` wraps `MongoUserRepository` + `ICacheService`: `findById` is cache-aside, `save` writes-through and invalidates. Follow this pattern rather than embedding cache calls in adapters.

#### Video user upload

`upload.middleware.ts` (presentation layer) handles `multipart/form-data` with **busboy**: streams the file into memory, enforces `MAX_UPLOAD_BYTES` (500 MB), validates MIME type (`video/mp4`, `video/quicktime`, `video/webm`), and caps in-process concurrency at 5 (`MAX_CONCURRENT_UPLOADS`). The result lands in `res.locals.uploadedFile`. `CloudinaryVideoStorage` (`IVideoStorage`) uploads the buffer; `public_id = key` makes re-uploads idempotent.

#### Config

**Never read `process.env` directly.** Import `env` from `@shared/infrastructure/config/env` — Zod-validated, frozen. Add new vars to `env.schema.ts`, `.env.example`, and `tests/setup-env.ts`. Helpers: `isProduction`, `isTest`.

#### Response envelope

Every successful API response is `{ success: true, data: <fields> }`, sent via `respond(res, status, data)` from `@shared/presentation/http/respond` — never `res.json(dto)` directly. `data` is built field-by-field by the module's presenter (`presentation/<module>.presenter.ts`, e.g. `presentVideo`, `presentAuthResult`); controllers never forward a use-case result wholesale, so the presentation layer owns the wire contract and a grown DTO can't silently leak new fields. Outside the envelope: 204 no-content responses, the billing payment webhook ack, the connections OAuth 302 redirect, and `/health*`. The clients unwrap `data` centrally (`api-client.ts` + the XHR path in `video.api.ts`), so data-layer types stay envelope-free.

#### Errors

Throw subclasses of `AppError` (`@shared/domain/errors`: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ConflictError`, `TooManyRequestsError`, …). The global `errorHandler` maps `AppError` → its `statusCode`/`code`, `ZodError` → 422, else → 500. Error responses are `{ success: false, error: { code, message, requestId, details? } }`. Don't `res.status(500)` by hand.

#### Path aliases

`@modules/*`, `@shared/*`, `@container/*` (defined in `tsconfig.json`, mirrored in `jest.config.js`). `tsc-alias` rewrites them in `dist/`.

### Frontend (`frontend/`)

MVVM as a **modular monolith** with strict layers — **Data** (typed API client + TanStack Query fns) → **ViewModel** (feature hooks, no JSX) → **Presentation** (React components, no direct API calls).

```
src/
  modules/<feature>/
    data/            # typed API client calls + query-key factories
    viewmodels/      # custom hooks; bridge data → presentation
    presentation/    # React components and pages
  shared/
    data/            # global api-client, http-error, query-client
    config/          # env vars
    lib/             # utilities
    ui/              # shared components
  app/               # React Router layout + routes
```

- State: **TanStack Query** for server state, **Zustand** for client-only state.
- Styling: **Tailwind CSS** wired to Reelo design tokens.
- Testing: **Vitest** + React Testing Library (unit/viewmodel), **MSW** for mocking HTTP in viewmodel tests, **Playwright** for e2e (mocked API).

### Mobile (`mobile/`)

Mirrors the frontend 1:1 — same modules, same three layers (`data/`, `viewmodels/`, `presentation/`), same validation and error mapping. Data/viewmodel layers are direct ports from the web app.

```
src/
  modules/<feature>/
    data/
    viewmodels/
    presentation/
  shared/
```

- Navigation: **expo-router** (file-based).
- Styling: **NativeWind** (same design tokens as web).
- State: TanStack Query + Zustand.
- Mobile-specific: session refresh token in device keychain (`expo-secure-store`); OAuth and Stripe Checkout open in system/in-app browser with refetch-on-return; native video playback (`expo-video`).
- Testing: **Jest** + React Native Testing Library.
- Physical devices need `EXPO_PUBLIC_API_URL` set to the machine's LAN IP.

## Notable behaviors

- **Refresh-token rotation with reuse detection** (`refresh-tokens.usecase.ts`): refresh tokens are single-use, rotated within a "family". A token that verifies but is absent from Redis is a replay → the **entire family is revoked**. Preserve this when touching auth.
- **MongoDB replica set for billing:** the credit debit flow uses multi-document transactions, which require a replica set. The Docker Compose setup initialises one automatically (`rs0`). Without Docker, run `mongod --replSet rs0`, run `rs.initiate()` once, and set `MONGO_URI` with `?replicaSet=rs0`. A standalone `mongod` also works — the app falls back to non-transactional writes.
- **Credit atomicity:** balance debits use `$inc` conditional on `balance >= amount` — concurrent debits can't overdraw. Charges happen on video create (402 if insufficient); refunded if generation fails.
- **Health:** `/health` is liveness (always exempt from rate limiting); `/health/ready` checks Mongo + Redis → 503 if degraded.
- **Rate limiting** is Redis-backed (fixed-window) so limits hold across replicas, behind an `IRateLimiter` port. Global per-IP on `/api/v1/*`; stricter tier on `/auth/register` + `/auth/login`. When `TRUST_PROXY=true`, `req.ip` comes from `X-Forwarded-*`.
- **Load balancing:** nginx is the single public entrypoint (`:8080`); API replicas are stateless (Redis-backed sessions and rate limits). Each response carries `X-Instance-Id` for tracing.
- **OAuth tokens** for social connections are encrypted at rest (AES-256-GCM), auto-refreshed before use, and never returned to clients. Unrefreshable connections flip to `expired`.
- **Agent confirmation handshake** (`agent` module): `AgentLoop` runs the model↔tool conversation, but a tool with `requiresConfirmation` (only `publish_video`) is *never* executed there — the loop records a `pendingAction` and returns, deliberately leaving that `tool_use` block unanswered until `ResolveAgentAction` supplies the matching `tool_result`. A new turn while one is pending is a 409. `disable_parallel_tool_use` keeps the model to one call per turn so a pause can't strand a sibling `tool_use`. Reasoning blocks are persisted verbatim (they must be replayed unedited) and dropped by the presenter. The agent calls the existing video/publishing/connections use cases through narrow ports — it reimplements nothing.
- **Conversations are soft-deleted:** `DELETE /agent/conversations/:id` sets `isDeleted` rather than removing the row, since a transcript records billed side effects. `MongoConversationRepository` filters `isDeleted` out of **both** `findById` and `findByOwner` (using `$ne: true`, so pre-flag documents read as live), so no use case can act on a deleted conversation. Any new query on that collection must apply the same filter.

- **Video generators are selectable per video.** `buildGenerators()` registers *every* generator whose credentials are configured (Sora, Kling, Pika-via-fal) rather than picking one, and `GET /videos/providers` reports each one's `available` + `supportsAudio` so the client can show green/red dots and disable what it can't use. `VIDEO_PROVIDER` now names the **default**, with one exception: `VIDEO_PROVIDER=stub` is a hard kill switch that registers nothing else, which is how `tests/setup-env.ts` guarantees no test reaches a live API. Availability is checked in `CreateVideo` **before** `authorizeGeneration`, so an unconfigured provider is a 422 that never charges credits and leaves no refund to reconcile. A provider missing from the registry raises rather than falling back — substituting a generator would bill the user for a video made by something they didn't pick.
- **A video records the generator that made it** (`provider` on the entity, document, and wire DTO). `ReconcileGeneration` polls `video.provider`, never the current default: with several generators live, a `jobRef` is only meaningful to the one that issued it. `null` means an upload or a row written before selection existed, and falls back to the default.
- **Pika (fal.ai) uses the queue API and drops the model sub-path.** Submit goes to `queue.fal.run/{PIKA_MODEL}` with `Authorization: Key …`, but status and result live at `queue.fal.run/{namespace}/{app}/requests/{id}` — fal omits the sub-path there, which is what `toQueueBase()` encodes. Output stays on fal's CDN, so like Kling it returns no `assetId` and cannot take composited music/narration; that's what `PROVIDER_SUPPORTS_AUDIO` tells the UI, which disables the audio controls rather than letting them fail silently.
- **Analytics metrics are per-post isolated:** `SyncUserMetrics` sweeps every published post, and each one is wrapped in its own try/catch — a revoked token, a deleted post, or a platform 429 fails that post alone and the sweep continues, returning `{ synced, failed }`. Without that a single bad post aborts the refresh partway and surfaces as a 500. Real providers exist for YouTube (Data API `videos.list`; **no share count**, so shares are always 0), Instagram (media `insights`), and TikTok (Display API `video/query`); Facebook stays stubbed because it has no publisher. Each activates when that platform's OAuth credentials are set — the providers authenticate with the connection's token and have no credentials of their own.
- **The TikTok external post id is the published post id,** not the `publish_id`: the Display API rejects the upload-session handle, so `waitForPublish` reads `publicaly_available_post_id` from the final status check and falls back to the `publish_id` only when TikTok withholds it (SELF_ONLY posts). Publications written before this change store a `publish_id` and can never be synced — they fail per-post and are skipped.
- **Metrics scopes require re-authorization:** `video.list` (TikTok) and `instagram_business_manage_insights` (Instagram) were added to the existing scope lists. Connections authorized earlier keep their old scopes and their metrics lookups fail until the user reconnects — adding a scope never upgrades a stored token.

## Conventions

- TypeScript is **strict** with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`. Prefix intentionally-unused vars/args with `_`.
- `no-console` / `no-explicit-any` are warnings. Use the pino `logger` from `@shared/infrastructure/logging`.
- One use case per class with an `execute(...)` method.
- Async route handlers wrap with `asyncHandler` so rejections reach the error pipeline.
