# larpDB

A management platform for live-action roleplay (LARP) groups. Handles characters, events, XP, NPCs, plots, and site configuration for a single LARP game.

## Stack

- **API** — Fastify + Drizzle ORM + PostgreSQL (Docker)
- **Web** — Next.js 14 (App Router)
- **Shared** — TypeScript types and Zod schemas in `packages/shared`
- **Package manager** — pnpm (managed via corepack)

## Prerequisites

- Docker Desktop running
- Node.js via nvm (`nvm use 20`)
- pnpm via corepack (`corepack enable`)

## First-time setup

**1. Start the database**

```bash
docker compose up -d db
```

**2. Run migrations**

```bash
pnpm --filter @larpdb/api db:migrate
```

**3. Seed the database** (creates the owner account and game)

```bash
pnpm --filter @larpdb/api db:seed
```

Default credentials: `webdevmeg@gmail.com` / `password`

## Running the app

Run the API and web app in separate terminals.

**API** (runs on port 3001):

```bash
pnpm --filter @larpdb/api dev
```

**Web** (runs on port 3000):

```bash
pnpm --filter @larpdb/web dev
```

Then open `http://localhost:3000`.

## Database

**Run migrations** (apply new migrations after pulling changes):

```bash
pnpm --filter @larpdb/api db:migrate
```

**Generate a new migration** (after editing `apps/api/src/db/schema.ts`):

```bash
pnpm --filter @larpdb/api db:generate
```

**Re-seed from scratch** (clears all data and re-seeds):

```bash
PGPASSWORD=larpdb /Applications/Postgres.app/Contents/Versions/latest/bin/psql -h 127.0.0.1 -p 5432 -U larpdb -d larpdb -c "TRUNCATE users, game, game_members, site_config, character_schemas, characters, xp_transactions, events, event_registrations, npcs, plots, store_items, purchases, schema_templates CASCADE;"
pnpm --filter @larpdb/api db:seed
```

## Shared package

Any change to `packages/shared/src/` must be rebuilt before the API or web app picks it up:

```bash
pnpm --filter @larpdb/shared build
```

Restart the API dev server after rebuilding.

## Tests

```bash
pnpm --filter @larpdb/api test
```

Tests run against a live PostgreSQL database (`larpdb_test`). The test database must exist — it is created and torn down per test run automatically.

## Project structure

```
apps/
  api/          Fastify API server
    src/
      db/       Drizzle schema, migrations, seed
      plugins/  JWT auth, game context middleware
      routes/   One file per resource
    drizzle/    Migration SQL files
  web/          Next.js frontend
    src/
      app/      App Router pages
      components/
      providers/
packages/
  shared/       Shared TypeScript types, Zod schemas, API client
```
