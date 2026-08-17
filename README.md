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

**Or just ask.** The **agent** (`POST /api/v1/agent/conversations`) runs the same loop
conversationally: say *"make a 30s neon city timelapse and post it to TikTok"* and it calls
the same use cases the forms do. Generation runs on its own; **publishing always pauses for
your approval** — the agent returns a `pendingAction` you approve or reject, because a post to
a real account can't be undone. Powered by Claude (`ANTHROPIC_API_KEY`), with a deterministic
stub model when no key is set.

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
| TikTok | ✅ real (Login Kit, PKCE) | ✅ real (Content Posting Direct Post) | Refresh tokens rotate on every refresh; posts stay SELF_ONLY until the app passes TikTok's audit |

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

Each app has its own path-filtered CI workflow. All run format → lint → typecheck → test;
the server also builds (compile + Docker image), and the frontend also builds and runs
Playwright e2e.

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
fake payments, a scripted agent). To go real, add credentials to `server/.env` —
`OPENAI_API_KEY` + `CLOUDINARY_URL` (Sora) or `KLING_*` keys, `GOOGLE_CLIENT_ID/SECRET`
(YouTube), `INSTAGRAM_APP_ID/SECRET` (Instagram Reels), `STRIPE_SECRET_KEY` +
`STRIPE_WEBHOOK_SECRET` (payments), `ANTHROPIC_API_KEY` (the agent — tune it with
`AGENT_MODEL`, `AGENT_EFFORT`, `AGENT_MAX_TOKENS`). Each integration switches on
independently.

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

Scripts: `lint` · `format:check` · `typecheck` · `test` / `test:cov` · `build` · `test:e2e`.

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
