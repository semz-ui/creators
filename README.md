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

| Phase | Scope |
| ----- | ----- |
| 0 | Foundation — tooling, config, Mongo/Redis infra, app + server bootstrap, health checks |
| 1 | Authentication — register, login, refresh-token rotation, password reset |
| 2 | Redis caching (cache-aside, generalized) |
| 3 | Rate limiting (Redis-backed, tiered) |
| 4 | Hardening & DX — logging, tests, Docker |

Each phase is delivered as a pull request.
