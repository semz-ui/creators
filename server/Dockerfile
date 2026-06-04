# ── Build stage ─────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install all deps (incl. dev) against the lockfile for a reproducible build.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies so only production deps are copied to the runtime image.
RUN npm prune --omit=dev

# ── Runtime stage ───────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Run as the built-in unprivileged `node` user.
USER node

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json ./

EXPOSE 4000

# Liveness check hits the in-process /health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
