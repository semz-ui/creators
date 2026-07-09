# Reelo

[![Server CI](https://github.com/semz-ui/creators/actions/workflows/server-ci.yml/badge.svg)](https://github.com/semz-ui/creators/actions/workflows/server-ci.yml)
[![Frontend CI](https://github.com/semz-ui/creators/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/semz-ui/creators/actions/workflows/frontend-ci.yml)
[![Mobile CI](https://github.com/semz-ui/creators/actions/workflows/mobile-ci.yml/badge.svg)](https://github.com/semz-ui/creators/actions/workflows/mobile-ci.yml)

**Prompt in. Video out. Everywhere.**

Reelo is an AI video studio for creators and small brands who want a constant stream of
short-form content without a production pipeline. Describe the video you want, and Reelo
generates it with AI, adds optional background music and AI voice-over narration, and
auto-publishes it to your connected social accounts — Facebook, Instagram, YouTube, and
TikTok — immediately or on a schedule. Engagement metrics flow back into one dashboard.

## The product

**The loop:**

1. **Prompt** — describe the clip (e.g. *"a neon-lit city timelapse at night, cinematic"*),
   pick a length (15–60s), optionally add a music track and a narrated script with one of
   six AI voices.
2. **Generate** — an AI video model (OpenAI Sora or Kling) renders the clip; Reelo stores
   it and shows live generation status.
3. **Publish** — pick the connected platforms, write a caption, and post now or schedule
   it. Each platform's result is tracked independently — one failing never blocks the rest.
4. **Measure** — views, likes, comments, and shares roll up per video and per platform.

**How it makes money:** generation is **credit-gated**. New accounts get free starter
credits; each video costs a flat credit price (refunded if generation fails), and users
top up through Stripe Checkout. Every balance movement is recorded in an auditable ledger.

**Platform integrations** (each behind a swappable port; real adapters switch on when
credentials are configured, stubs otherwise so the whole product runs locally for free):

| Platform | Connect (OAuth) | Publish | Notes |
| -------- | --------------- | ------- | ----- |
| YouTube | ✅ real (Google OAuth) | ✅ real (resumable upload) | Tokens auto-refresh; private uploads until the Google app is verified |
| Instagram | ✅ real (Instagram Business Login) | ✅ real (Reels container flow) | Requires a Professional account; 60-day self-refreshing tokens |
| Facebook | stub | stub | Planned |
| TikTok | stub | stub | Planned |

**Clients:** a responsive web app and a native mobile app (iOS + Android via Expo) with
full feature parity — same flows, same design tokens, same validation rules.

## Structure

```
creator/
├── server/     # Backend API — Express + TypeScript, onion architecture, modular monolith
├── frontend/   # Web client — React + Vite, MVVM modular monolith, TanStack Query
├── mobile/     # Mobile client — React Native (Expo), same MVVM architecture as the web app
└── nginx/      # Reverse proxy / load balancer for the Dockerized API
```

Work ships **one pull request per phase/module** (see the roadmap below). Each app has its
own path-filtered CI workflow running format → lint → typecheck → test (→ build/e2e).

## Backend (`server/`)

- **Framework:** Express.js + TypeScript (strict)
- **Architecture:** Onion (Domain → Application → Infrastructure → Presentation), modular monolith
- **Database:** MongoDB (Mongoose)
- **Cache / sessions / rate-limit store:** Redis
- **Auth:** JWT access + rotating refresh tokens
- **External services behind ports:** AI video generators (Sora, Kling), social OAuth +
  publishers (Google/YouTube, Instagram), payments (Stripe), metrics providers

See [`server/`](./server) for setup and scripts.

### Running locally

**With Docker (recommended)** — starts the nginx load balancer, API, MongoDB, and Redis together:

```bash
docker compose up --build
# API via the nginx LB on http://localhost:8080  ·  health: /health  ·  readiness: /health/ready

# Scale the API horizontally — the LB balances across replicas:
docker compose up --build --scale server=3
```

The bundled MongoDB runs as a **single-node replica set** (`rs0`) — initialised automatically on first boot — because the billing credit flow uses multi-document transactions, which MongoDB only allows on a replica set.

**Without Docker** — run Mongo + Redis yourself, then:

```bash
cd server
cp .env.example .env   # adjust secrets
npm install
npm run dev
```

> For transactional integrity, run MongoDB as a (single-node) replica set: start `mongod --replSet rs0`, run `rs.initiate()` once, and set `MONGO_URI=mongodb://localhost:27017/reelo?replicaSet=rs0&directConnection=true`. A standalone `mongod` also works — the app falls back to non-transactional writes.

Everything works out of the box with stub providers (fake generation, fake social posts,
fake payments). To go real, add credentials to `server/.env` — `OPENAI_API_KEY` +
`CLOUDINARY_URL` (Sora) or `KLING_*` keys, `GOOGLE_CLIENT_ID/SECRET` (YouTube),
`INSTAGRAM_APP_ID/SECRET` (Instagram Reels), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
(payments). Each integration switches on independently.

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

- **Unit** — pure logic (domain errors, env schema, providers/publishers with mocked HTTP, cache service).
- **Integration** — MongoDB via `mongodb-memory-server`; cache service via `ioredis-mock`.
- **E2E** — the assembled Express app driven with `supertest`.

CI (GitHub Actions) runs format → lint → typecheck → test (coverage) → build on every push to `main` and every PR.

## Frontend (`frontend/`)

- **Stack:** React + Vite + TypeScript (strict), **TanStack Query** (server state) + **Zustand** (client state), **Tailwind** wired to the Reelo design tokens, React Router.
- **Architecture:** MVVM as a modular monolith with strict layers — **Data** (typed API client + Query fns) → **ViewModel** (feature hooks) → **Presentation** (components). Views never call the API.
- **Testing:** Vitest + React Testing Library (unit), Vitest snapshots, MSW for viewmodel tests, **Playwright** e2e (mocked API).

```bash
cd frontend
cp .env.example .env        # VITE_API_URL → the server
npm install
npm run dev                 # http://localhost:3000
```

Scripts: `lint` · `format:check` · `typecheck` · `test` / `test:cov` · `build` · `test:e2e`. Built in phases F0–F7 (foundation → auth → video → connections → publishing → billing → analytics → polish), one PR each.

## Mobile (`mobile/`)

- **Stack:** React Native via **Expo** (expo-router file-based navigation), **NativeWind**
  styled with the same design tokens as the web app, TanStack Query + Zustand.
- **Architecture:** mirrors the web frontend 1:1 — `src/modules/<feature>/{data,viewmodels,presentation}`;
  the data and viewmodel layers are direct ports, so validation, error mapping, and polling
  behave identically across platforms.
- **Mobile-specific:** session refresh token lives in the device keychain (expo-secure-store);
  OAuth and Stripe Checkout open in the system/in-app browser with refetch-on-return;
  native video playback (expo-video) and native date/time pickers for scheduling.

```bash
cd mobile
npm install
npm start                   # press i (iOS simulator) or a (Android emulator)
```

The iOS simulator and Android emulator reach a local API automatically; physical devices
need `EXPO_PUBLIC_API_URL` set to your machine's LAN IP — see [`mobile/README.md`](./mobile/README.md).
Built in phases M1–M6 (foundation+auth → videos → connections → publishing → billing → analytics), one PR each.

## Roadmap

### Platform phases (server)

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 0 | Foundation — tooling, config, Mongo/Redis infra, app + server bootstrap, health checks | ✅ |
| 1 | Authentication — register, login, JWT access + rotating refresh tokens | ✅ |
| 2 | Redis caching (cache-aside, generalized) | ✅ |
| 3 | Rate limiting (Redis-backed, tiered) | ✅ |
| 4 | Hardening & DX — logging, tests, Docker | ✅ |
| 5 | Load balancing — nginx reverse proxy, horizontally scalable API | ✅ |

### Product modules (server)

| Module | Scope | Status |
| ------ | ----- | ------ |
| Video | Create from a prompt, async generation, music + AI narration | ✅ (real: Sora, Kling) |
| Connections | Link FB/IG/YouTube/TikTok (OAuth) with token refresh | ✅ (real: YouTube, Instagram) |
| Billing & Credits | Credit balance + ledger; Stripe Checkout top-ups; gates generation | ✅ (real: Stripe) |
| Publishing & Scheduling | Distribute a video to connected platforms, now or scheduled | ✅ (real: YouTube, Instagram) |
| Analytics | Per-video/platform metrics | ✅ (providers stubbed) |

### Clients

| Client | Scope | Status |
| ------ | ----- | ------ |
| Web (`frontend/`) | Full product UI, phases F0–F7 | ✅ |
| Mobile (`mobile/`) | Full feature parity, phases M1–M6 | ✅ |

Up next: Facebook + TikTok integrations, real analytics providers, Google/Meta app
verification for public availability, push notifications for generation/publish completion.

## Video API (Video module)

Base path `/api/v1/videos` (Bearer access token required, except the callback):

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/` | Bearer | Create a video (`prompt`, `durationSeconds` 5–60, optional music + narration); submits generation, returns it `processing` |
| GET | `/` | Bearer | List your videos, newest first (`?page`, `?limit`) |
| GET | `/:id` | Bearer | Get one of your videos (status, `resultUrl` when ready) |
| POST | `/callbacks/generation` | `x-generation-secret` | Provider callback that marks a job `ready`/`failed` |

A video moves `queued → processing → ready | failed`. The AI provider is a port (`IVideoGenerator` — Sora and Kling adapters, stub fallback) and reports completion via the callback or poll-on-read. Generation is **credit-gated** (see Billing): credits are charged on create (402 if the user can't afford it) and refunded if generation fails.

## Connections API (Connections module)

Link social accounts via OAuth (Authorization Code). Base path `/api/v1/connections`:

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/:platform/start` | Bearer | Begin linking; returns the provider `authorizationUrl` (with a one-time `state`) |
| GET | `/callback` | `state` token | OAuth redirect target; exchanges the code and links the account |
| GET | `/` | Bearer | List your connections (never tokens) |
| DELETE | `/:id` | Bearer | Disconnect |

Platforms: `facebook`, `instagram`, `youtube`, `tiktok`. Each provider is a port (`IOAuthProvider`) resolved via a registry — **YouTube (Google OAuth) and Instagram (Business Login) are real** when their credentials are configured; the rest are stubbed. The `state` is stored one-time in Redis (CSRF). OAuth **tokens are encrypted at rest** (AES-256-GCM) and never leave the server; expiring tokens are **auto-refreshed** before use, and unrefreshable connections flip to `expired`. The callback returns JSON, or 302-redirects to `CONNECTIONS_REDIRECT_URL` (with `?status=`) when set.

## Publishing API (Publishing module)

Distribute a ready video to connected platforms, immediately or scheduled. Base path `/api/v1/publications`:

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/` | Bearer | Publish a video (`videoId`, `platforms[]`, `caption?`, `scheduledAt?`); distributes now or schedules |
| GET | `/` | Bearer | List your publications (`?page`, `?limit`) |
| GET | `/:id` | Bearer | Get one (per-platform distribution status) |
| POST | `/process-due` | `x-scheduler-secret` | Run due scheduled publications (for a cron/scheduler) |

A publication holds a **distribution per target platform**; the overall status is derived (`completed` / `partially_failed` / `failed`), and per-platform failures are isolated with the real upstream error recorded per target. It validates the video is `ready` and that each platform has an active connection (cross-module reads via ports). Posting is a port (`ISocialPublisher`) — **YouTube (resumable upload) and Instagram (Reels container flow) are real**; the rest are stubbed. Scheduled publications are stored and run when a scheduler hits `/process-due`.

## Analytics API (Analytics module)

Engagement metrics (views / likes / comments / shares) per video and per platform. Base path `/api/v1/analytics` (Bearer):

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/refresh` | Pull current metrics for the caller's published posts and store them |
| GET | `/overview` | Account totals + per-platform breakdown + video count |
| GET | `/videos/:videoId` | Per-video, per-platform metrics + totals (empty if none) |

`refresh` reads the user's **published** posts (Publishing) and their **active connection** tokens (Connections), fetches metrics from a port (`IMetricsProvider`, stubbed per platform), and upserts a latest-metrics row per `(video, platform)`. Reads then aggregate those rows — no provider calls on the hot path. (Latest-snapshot only; historical trends are a future enhancement.)

## Billing API (Billing module)

Credit balance with an auditable ledger; top up via Stripe Checkout. Base path `/api/v1/billing`:

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/balance` | Bearer | Current credit balance (new accounts get `INITIAL_FREE_CREDITS`) |
| GET | `/ledger` | Bearer | Paged transaction history |
| POST | `/topup` | Bearer | Start a top-up; returns `{ checkoutUrl, paymentId }` |
| POST | `/webhooks/payment` | webhook signature / `x-payment-secret` | Provider webhook that credits the account (idempotent) |

Balances change through one service that records a ledger entry per movement; debits are **atomic** (`$inc` conditional on `balance >= amount`) so concurrent debits can't overdraw. Generation is gated via an `ICreditGuard` the Video module depends on: **charge on create** (`VIDEO_CREDIT_COST`, 402 if short), **refund on failure**. Payments run through Stripe Checkout when `STRIPE_SECRET_KEY` is set (stub provider otherwise); top-ups complete via the webhook.

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

## Load balancing (Phase 5)

An **nginx** reverse proxy is the single public entrypoint (`:8080`); the API runs as N stateless replicas behind it.

- The app publishes no host port — only nginx is exposed — so `--scale server=N` works without port conflicts.
- nginx resolves the `server` service via Docker DNS on each request, round-robining across all replicas.
- Horizontal scaling needs no sticky sessions: auth sessions and rate-limit counters live in shared Redis, so any replica serves any request. Verified end-to-end (refresh-token rotation and reuse detection hold across instances).
- nginx forwards `X-Forwarded-*`; with `TRUST_PROXY=true` the app keys rate limiting on the real client IP.
- Each response carries an `X-Instance-Id` header (container hostname) for tracing which replica served it.

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
