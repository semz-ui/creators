# Reelo — Case Study

**An AI video studio: describe a video, generate it, publish it to Facebook, Instagram, YouTube and TikTok.**

| | |
|---|---|
| Role | Sole engineer — architecture, backend, web, mobile, infra |
| Timeline | June – August 2026 · 176 commits |
| Size | 3 apps · ~27,800 lines of TypeScript · 154 test files |
| Stack | Node 20 · Express · MongoDB · Redis · React · React Native (Expo) · Docker · nginx |

---

## The problem

Making a short video is now easy. Getting it *out* is not. Every platform has its own
OAuth flow, its own upload API, its own rules about formats and captions, and its own way
of expiring your credentials at the worst moment. A creator ends up doing the same tedious
ritual four times per clip.

Reelo collapses that into one flow: write a prompt, pick a generator, publish everywhere.

## What I built

Three apps sharing one API:

- **Server** — TypeScript/Express API on MongoDB + Redis. Seven feature modules: auth,
  video, connections, publishing, analytics, billing, agent.
- **Web** — React + Vite, TanStack Query for server state, Tailwind.
- **Mobile** — React Native via Expo Router, NativeWind, native video playback.

Plus the real integrations: OpenAI Sora, Kling and Pika for generation, Cloudinary for
storage, Meta/Google/TikTok OAuth for publishing and metrics, Stripe for payments, and an
agent built on the Claude API that can drive the whole product conversationally.

## Architecture

The server is a **modular monolith on onion architecture**. Each feature is self-contained
with four layers, and dependencies only point inward:

```
modules/<feature>/
  domain/          entities, ports (interfaces), errors — no framework imports
  application/     use cases — one class, one execute()
  infrastructure/  adapters implementing the ports (Mongo, Redis, Cloudinary, HTTP…)
  presentation/    controllers, routers, validators
  <feature>.module.ts   composition root: wires adapters → use cases, returns a Router
```

There's no DI framework. `buildContainer()` wires everything by hand, and `createApp()`
accepts a pre-built container — so tests inject fakes without touching production
singletons, and `createApp` performs no I/O.

Web and mobile mirror this with **MVVM**: a typed data layer → viewmodel hooks (no JSX) →
components (no API calls). The mobile data and viewmodel layers are near-direct ports of
the web ones.

## Decisions worth explaining

**Every integration is dual-mode.** Each external service sits behind a port. The real
adapter activates only when its credentials are in the environment; otherwise a stub runs.
The entire product — generate, connect, publish, pay — runs locally for free with no API
keys. It's also what makes a public demo safe: there is no key to burn or leak.

**Generators are selectable, not fallback.** Every configured generator is registered, and
`GET /videos/providers` reports which are available and which support audio, so the UI can
grey out what it can't do. If the picked provider isn't registered, the request fails —
it never silently substitutes another one, because that would bill someone for a video
made by something they didn't choose. Availability is checked *before* credits are
charged, so an unconfigured provider is a 422 with no refund to reconcile.

**Refresh tokens rotate, and replay is fatal.** Refresh tokens are single-use within a
family. A token that verifies cryptographically but is absent from Redis is a replay — so
the entire family is revoked, logging the compromised session out everywhere.

**Credits can't be oversold.** Debits are a conditional `$inc` (`balance >= amount`), so
concurrent requests can't overdraw. Charges land on video creation (402 if short) and are
refunded automatically if generation fails.

**The agent pauses instead of guessing.** The agent runs a normal model↔tool loop, but
`publish_video` is marked `requiresConfirmation` and is *never* executed inside the loop.
Instead the loop records a pending action and returns, deliberately leaving the `tool_use`
block unanswered until the user confirms and a separate use case supplies the matching
`tool_result`. Parallel tool use is disabled so a pause can't strand a sibling call.

**Analytics fail per-post, not per-sweep.** The metrics sync walks every published post
with each one in its own try/catch. A revoked token or a deleted post fails that post
alone and returns `{ synced, failed }` — without that, one bad post aborts the whole
refresh and surfaces as a 500.

**Stateless by construction.** Sessions and rate limits live in Redis, so replicas hold no
local state. `docker compose up --scale server=3` puts three instances behind nginx on one
port; every response carries `X-Instance-Id` for tracing.

**One wire contract.** Every success response is `{ success: true, data }`, built
field-by-field by a per-module presenter. Controllers never forward a use-case result
wholesale, so a growing internal DTO can't quietly leak new fields onto the API.

## Testing

154 test files — server 83, web 61, mobile 10.

Server tests are layered: **unit** (pure logic, no I/O), **integration** (real Mongo via
`mongodb-memory-server`, Redis via `ioredis-mock`), and **e2e** (the assembled app driven
through supertest). Web viewmodels run on Vitest + Testing Library with MSW mocking HTTP;
Playwright covers e2e against a mocked API.

TypeScript is strict everywhere, including `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. CI is path-filtered per app: format → lint → typecheck →
test → build, so a web change doesn't run the server pipeline.

## What I'd do next

- Move generation and scheduled publishing onto a real job queue (BullMQ) with retries and
  dead-lettering, replacing the secret-guarded scheduler endpoint.
- Extract the duplicated web/mobile data + viewmodel layers into a shared package instead
  of mirroring them by hand.
- Real observability — metrics and tracing beyond the per-instance header.

---

<sub>Built end-to-end by Michael Olotu.</sub>
