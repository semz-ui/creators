# Reelo Mobile

React Native (Expo) app for Reelo — prompt → AI-generated video → auto-publish. Mirrors the web
frontend's MVVM architecture: each feature lives in `src/modules/<feature>/{data,viewmodels,presentation}`,
with routes under `src/app/` (expo-router) as thin shells over presentation screens.

## Run it

```bash
npm install
npm start            # Expo dev server; press i (iOS simulator) or a (Android emulator)
```

The app talks to the Reelo API (run it from `server/` with `npm run dev`, or `docker compose up`
from the repo root). API base URL resolution:

- **iOS simulator** — defaults to `http://localhost:4000`, no config needed.
- **Android emulator** — defaults to `http://10.0.2.2:4000` (the emulator's alias for the host).
- **Physical device** — set your machine's LAN IP in `.env`:
  `EXPO_PUBLIC_API_URL=http://192.168.x.x:4000` (device and machine on the same network; restart
  `npm start` after changing env vars).

## Stack

- **expo-router** — file-based navigation (`src/app/`), auth guard via the `(app)` layout
- **NativeWind** — Tailwind styling with the same design tokens as the web frontend
- **TanStack Query** — server state (30s staleTime, polling for generation/publishing)
- **Zustand + expo-secure-store** — session (refresh token + user persisted in the device
  keychain; access token in memory, re-minted on launch)

## Scripts

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint (eslint-config-expo + prettier)
npm run format:check # prettier
npm test             # jest (jest-expo preset)
```

CI (`.github/workflows/mobile-ci.yml`) runs format → lint → typecheck → test on every PR touching
`mobile/`.
