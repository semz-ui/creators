# Plan: Bring-Your-Own-Key (BYOK) for OpenAI / Sora generation

## Context

The app's OpenAI (Sora) key is expensive, so we don't want it live on a public
deploy. This feature lets **each user supply their own OpenAI key** for video
generation, so the platform never has to hold a paid key. Two ways to supply it:

1. **Paste-per-generation** — user pastes their `sk-...` key on the generate form;
   it is used for that one video and never persisted to Mongo.
2. **Saved vault** — user saves their key once; it's encrypted at rest. The server
   generates a random **encryption key**, emails it to the user, and does **not**
   store it. To generate, the user pastes that emailed encryption key to unlock the
   saved OpenAI key.

Both feed a single per-request key path. Credits are **still charged** on BYOK
generations (existing 5-credit flow unchanged). The app still uses **its own
Cloudinary** (free tier) for result storage — only the OpenAI key is user-supplied.

### Key constraint discovered during exploration
Sora generation is **asynchronous**: the key is needed at `submit` **and again
later** at `poll`/download time (a separate request, or the server-side callback).
So even the "not saved" key must live **transiently server-side** (Redis, encrypted,
short TTL, purged on completion) for the job to finish. It is never persisted to
Mongo — that's the durable-storage distinction. This is unavoidable given how Sora
works and should be documented in the code.

### Reused building blocks (no new deps — `crypto-js` NOT needed)
- `AesGcmTokenCipher` / `ITokenCipher` — `server/src/modules/connections/{infrastructure/aes-gcm-token-cipher.ts, domain/ports/token-cipher.ts}`. Generic AES-256-GCM string cipher (IV|tag|ciphertext, base64). Reused for both the saved-vault ciphertext and the transient Redis value.
- `IEmailSender` + Resend/stub adapters — `server/src/modules/auth/{domain/ports/email-sender.ts, infrastructure/resend-email-sender.ts, infrastructure/stub-email-sender.ts}`. Add one method for the encryption-key email.
- `SoraVideoGenerator` — `server/src/modules/video/infrastructure/sora-video-generator.ts`. Already takes `apiKey` purely via constructor config; we build per-request instances.
- Env prod-guard pattern — `env.schema.ts` `DEV_DEFAULT_SECRETS` + `superRefine` (add the new BYOK secret here).
- Zustand transient-secret pattern — `frontend/src/modules/auth/session/session.store.ts` keeps `accessToken` in memory only (excluded from `partialize`). Mirror this for the pasted key / emailed encryption key.

---

## Server changes

### 1. New env var
- `env.schema.ts`: add `BYOK_ENC_KEY` (min 16 chars, default in `DEV_DEFAULT_SECRETS` so the production `superRefine` forces a real value). Add to `.env.example` and `tests/setup-env.ts`. Used only to encrypt the **transient Redis** copy of the plaintext key (defense-in-depth on a Redis dump). The saved-vault ciphertext is NOT protected by this — its secret is the emailed key.

### 2. New `byok` module — `server/src/modules/byok/` (saved-vault CRUD)
Follows the four-layer module convention; `byok.module.ts` composition root returns a router.
- **domain**: `ApiKeyVault` entity (`userId`, `ciphertext`, `createdAt`, `keyHint` e.g. last-4). Ports: `IApiKeyVaultRepository` (`upsert`, `findByUser`, `deleteByUser`), and a small `IEncKeyGenerator` (random 32-byte `base64url`).
- **application** use cases (one `execute()` each):
  - `SaveApiKey` — validate key format (`sk-` prefix, length bounds) → generate `encKey` → `cipher = new AesGcmTokenCipher(encKey)` → `ciphertext = cipher.encrypt(openAiKey)` → repo `upsert({userId, ciphertext, keyHint})` → `emailSender.sendApiKeyEncryptionKeyEmail({to, encKey})`. **Never persist `encKey`.** Returns only `{ keyHint }` (encKey is emailed, shown once).
  - `DeleteApiKey`, `GetApiKeyStatus` (returns `{ saved: boolean, keyHint? }`).
- **infrastructure**: `MongoApiKeyVaultRepository`; `CryptoEncKeyGenerator`.
- **presentation**: routes behind `authGuard` — `POST /api/v1/byok` (save), `DELETE /api/v1/byok`, `GET /api/v1/byok` (status). Validators for key format. Presenter returns only non-secret fields (`keyHint`, `saved`). Rate-limit the save route.
- Wire in `container/index.ts` + `app.ts` (`app.use('/api/v1/byok', container.byokRouter)`).

### 3. Email method
- `IEmailSender`: add `sendApiKeyEncryptionKeyEmail({ to, encKey }): Promise<void>`.
- `ResendEmailSender`: subject "Your Reelo encryption key", body states it's shown once, can't be recovered, and to keep it safe. `StubEmailSender`: `logger.info` the encKey (so local dev works without Resend).

### 4. Transient per-request key store (Redis) — in `video` module (or `shared`)
- Port `IByokKeyStore`: `put(videoId, plaintextKey, ttlSeconds)`, `get(videoId): Promise<string|null>`, `delete(videoId)`.
- `RedisByokKeyStore` adapter: value stored as `AesGcmTokenCipher(BYOK_ENC_KEY).encrypt(plaintextKey)`; key `byok:{videoId}`; TTL generous enough to outlast Sora generation (e.g. 2h). `get` decrypts.

### 5. Per-request generator resolution (the crux) — `video` module
The current single boot-time generator can't carry a per-user key. Introduce a
**generator resolver** closure built in `video.module.ts`:
`resolveGenerator(videoId): Promise<IVideoGenerator>`:
- `key = await byokKeyStore.get(videoId)`.
- If `key`: require app `CLOUDINARY_URL` (else `ValidationError` "storage not configured"); build `new SoraVideoGenerator({ apiKey: key, model, size, baseUrl }, cloudinaryStorage)` (+ `OpenAiSpeechSynthesizer(key)` when narration is used).
- Else: return the existing app-wide default generator (stub / app-Sora / Kling) — unchanged behavior.

Thread the resolver + stores into the three use cases that touch the generator:
- **`CreateVideo`** (`application/create-video.usecase.ts`) — new flow:
  1. Resolve plaintext key from request: paste mode → `input.openAiApiKey`; vault mode → load `ApiKeyVault` for user, `AesGcmTokenCipher(input.savedKeyEncKey).decrypt(ciphertext)` (decrypt failure ⇒ `ValidationError` "wrong encryption key" — GCM auth tag is the built-in check). No key ⇒ fall through to default generator (stub) as today.
  2. `Video.create(...)` → get `videoId`.
  3. If a BYOK key was resolved: `byokKeyStore.put(videoId, key, ttl)`.
  4. `credits.authorizeGeneration()` **(still charged)**.
  5. `gen = await resolveGenerator(videoId)` → `gen.submit(...)`; on submit failure `credits.refundGeneration()` + `byokKeyStore.delete(videoId)`.
- **`ReconcileGeneration`** (poll-on-read, `GET /videos/:id`) — loads Video (has `id`+`jobRef`); `gen = await resolveGenerator(video.id)`; `gen.poll(jobRef)`; on `ready`/`failed` → `byokKeyStore.delete(video.id)`. If key TTL-expired mid-flight, poll degrades to `failed` with a "key expired, regenerate" message.
- **`ApplyGenerationResult`** (server-side callback path) — resolve generator by `videoId` from the callback body; delete the transient key after applying.

### 6. Request DTO + validator
- `CreateVideoInput` (`application/dto.ts`) + `createVideoSchema` (`presentation/video.validators.ts`): add optional, mutually-exclusive `openAiApiKey?` (paste) and `savedKeyEncKey?` (vault unlock). Length/format bounds; never logged.
- **Never log** either field or request headers containing the key (audit the Sora adapter's error paths so a failed call can't dump the `Authorization` header).

---

## Frontend changes

### Data (`frontend/src/modules/video/data/`, + new byok data)
- Extend `CreateVideoInput` (`video.types.ts`) with `openAiApiKey?` / `savedKeyEncKey?`.
- New `byok.api.ts`: `saveKey(openAiApiKey)` → `POST /api/v1/byok`; `deleteKey()`; `getStatus()` → `GET /api/v1/byok`. Types in `byok.types.ts`.

### Transient secret store (Zustand)
- New `useByokKeyStore` mirroring `session.store.ts`: holds the pasted key / entered encryption key **in memory only**, excluded from `persist`/`partialize`, cleared on logout. Never written to localStorage.

### ViewModels
- `useCreateVideoViewModel.ts`: add `keySource` state (`'saved' | 'paste' | 'none'`), plus `pastedKey` / `encKey` fields; include the right field in `mutation.mutate(...)`. Extend `toFormError` to map an invalid/decrypt/401-from-OpenAI error code to a friendly message (alongside the existing 402 case).
- New `useSaveApiKeyViewModel` and `useApiKeyStatusViewModel` (descriptive-instance naming per project convention).

### Presentation
- `GenerateVideoPanel.tsx`: add a key-source selector — "Use my saved key" (passphrase→ here, the emailed encryption-key input) vs "Paste a key now" (`sk-...`), shown when app is in BYOK mode. Reuse `@/shared/ui` inputs (confirm a password-type `Input` exists; add one if not).
- New **Settings / API key** page (no settings module exists today): add `/settings` route in `app/router.tsx` + a nav entry in `app/layout/AppLayout.tsx`. Page uses the save/status/delete viewmodels; on save, surface the one-time notice that the encryption key was emailed and can't be recovered.

### Mobile
Out of scope for the first cut. Mirror the data/viewmodel/store layers afterward
(the mobile app is a 1:1 port) — noted as follow-up, not part of this plan.

---

## Security notes (baked into the implementation)
- Saved-vault ciphertext is useless on its own: the server never stores the emailed
  encryption key, so a Mongo-only leak can't reveal saved OpenAI keys.
- Transient Redis copy is AES-GCM-encrypted (`BYOK_ENC_KEY`) and auto-purged on
  completion/failure + TTL.
- Emailed encryption key is shown once, unrecoverable; forgetting it ⇒ re-save.
- Keys/enc-keys are never logged; validate `sk-` format; rate-limit the save route.
- `BYOK_ENC_KEY` added to `DEV_DEFAULT_SECRETS` so production refuses the dev default.

## Critical files
- New: `server/src/modules/byok/**`, `server/src/modules/video/infrastructure/redis-byok-key-store.ts`, `frontend/src/modules/video/data/byok.api.ts`, `frontend/src/modules/byok/**` (settings page + viewmodels), `frontend/.../useByokKeyStore.ts`.
- Edit: `server/src/modules/video/{video.module.ts, application/create-video.usecase.ts, application/reconcile-generation.usecase.ts (poll path), application/apply-generation-result.usecase.ts, application/dto.ts, presentation/video.validators.ts}`, `server/src/modules/auth/domain/ports/email-sender.ts` (+ both adapters), `server/src/shared/infrastructure/config/env.schema.ts`, `server/.env.example`, `server/tests/setup-env.ts`, `container/index.ts`, `app.ts`, `frontend/src/modules/video/{data/video.types.ts, viewmodels/useCreateVideoViewModel.ts, presentation/GenerateVideoPanel.tsx}`, `frontend/src/app/{router.tsx, layout/AppLayout.tsx}`.

---

## Verification
1. **Unit**: cipher round-trip with a generated encKey; `RedisByokKeyStore` put/get/delete + TTL; `SaveApiKey` (encrypts, emails via stub, does NOT persist encKey, returns only keyHint); `CreateVideo` BYOK branch (resolves paste + vault keys, charges credits, stashes transient key, wrong encKey ⇒ ValidationError).
2. **Integration** (real Mongo + ioredis-mock): `POST /api/v1/byok` stores a ciphertext doc and the stub logs an encKey; `POST /api/v1/videos` with a pasted key drives the Sora path (mock Sora HTTP) and stashes the transient key; `GET /api/v1/videos/:id` polls/downloads with that key then purges it; credits debited.
3. **e2e** (supertest, stub email + mocked Sora): save key → unlock via emailed encKey → generate → poll → ready; and paste-per-use → generate → ready.
4. **Manual (the real point)**: deploy/run with app `CLOUDINARY_URL` set (free) but **no** `OPENAI_API_KEY` (so default provider = stub). In the UI, paste a real OpenAI key → confirm a genuine Sora video is produced and stored in the app's Cloudinary; then exercise save-key → read the encKey from stub logs → unlock → generate. Confirm no key/encKey appears in logs.
5. `npm run typecheck && npm run lint && npm test` in `server/` and `frontend/`.
