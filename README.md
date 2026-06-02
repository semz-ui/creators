# Creators

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

## Roadmap

| Phase | Scope |
| ----- | ----- |
| 0 | Foundation — tooling, config, Mongo/Redis infra, app + server bootstrap, health checks |
| 1 | Authentication — register, login, refresh-token rotation, password reset |
| 2 | Redis caching (cache-aside, generalized) |
| 3 | Rate limiting (Redis-backed, tiered) |
| 4 | Hardening & DX — logging, tests, Docker |

Each phase is delivered as a pull request.
