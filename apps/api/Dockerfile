FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/desktop/package.json ./apps/desktop/
COPY apps/e2e/package.json ./apps/e2e/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @plotrunner/shared build
RUN pnpm --filter @larpdb/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@9
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/mobile/package.json ./apps/mobile/
COPY --from=builder /app/apps/desktop/package.json ./apps/desktop/
COPY --from=builder /app/apps/e2e/package.json ./apps/e2e/
RUN pnpm install --prod --frozen-lockfile
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 apiuser
USER apiuser

WORKDIR /app/apps/api
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/index.js"]
