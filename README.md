# larpDB

A management platform for live-action roleplay (LARP) groups. Handles characters, events, XP, NPCs, plots, and site configuration for a single LARP game.

## Stack

- **API** — Fastify + Drizzle ORM + PostgreSQL (Docker)
- **Web** — Next.js 14 (App Router)
- **Shared** — TypeScript types and Zod schemas in `packages/shared`
- **Package manager** — pnpm (managed via corepack)

## Features

**For players**
- Character sheets built from a schema defined by the game owner
- XP balance display (available / spent) on the character sheet
- Spend XP on editable skill stats; validation prevents overspending
- Event registration and rulebook access

**For GMs and owners**
- Schema builder — drag-and-drop field editor supporting statblocks, selects, toggles, text, hit points, attacks, spells, and more
- Per-character XP management: award XP, sync to level, reset all spends
- Level adjustment (±1) directly from the character sheet
- Character progression via level-entry tables on stat fields
- Event creation and registration tracking
- Store item management

**Admin (owner only)**
- Site configuration: game identity (name, logo, banner), rulebook, codex, store settings, build/version info
- User and member management
- Schema versioning (create and activate new schema versions)
- Posts and announcements with player likes and comments

**Sys_admin**
- View and delete any adventure across all games (`/adventures`)
- View and delete any character across all games (`/characters`)
- Promote any user to sys_admin

**LARP Builder**
- Public browse page (`/browse`) to discover games
- Per-game landing page (`/larps/[slug]`) for public-facing game info
- Owner game creation and setup flow

## Prerequisites

- Docker Desktop running
- Node.js via nvm (`nvm use 20`)
- pnpm via corepack (`corepack enable`)

> **Mac note:** Docker Desktop does not add `docker` to your shell PATH automatically. Add it once:
> ```bash
> echo 'export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"' >> ~/.bash_profile
> source ~/.bash_profile
> ```

## First-time setup

**1. Create the API environment file**

```bash
cp apps/api/.env.example apps/api/.env
```

If `.env.example` doesn't exist, create `apps/api/.env` with:

```
DATABASE_URL=postgresql://larpdb:larpdb@localhost:5432/larpdb
JWT_SECRET=dev-secret-key-at-least-16-chars
ALLOWED_ORIGIN=http://localhost:3000
PORT=3001
NODE_ENV=development
```

**2. Start the database**

```bash
docker compose up -d db
```

**3. Run migrations**

```bash
pnpm --filter @larpdb/api db:migrate
```

**4. Seed the database** (creates the owner account and game)

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
PGPASSWORD=larpdb /Applications/Postgres.app/Contents/Versions/latest/bin/psql -h 127.0.0.1 -p 5432 -U larpdb -d larpdb -c "TRUNCATE users, game, game_members, site_config, character_schemas, characters, xp_transactions, events, event_registrations, npcs, plots, store_items, purchases, schema_templates, posts, post_likes, comments, larp_subscriptions CASCADE;"
pnpm --filter @larpdb/api db:seed
```

## Shared package

Any change to `packages/shared/src/` must be rebuilt before the API or web app picks it up:

```bash
pnpm --filter @plotrunner/shared build
```

Restart the API dev server after rebuilding.

## File uploads

Uploaded files (game logo, banner) are stored on local disk at `apps/api/uploads/`. This is intentional for local development — switch to S3 or equivalent object storage before deploying to production.

## Logs

API and web logs stream to stdout in their respective dev terminals. To follow them:

```bash
# API logs (Fastify/pino)
pnpm --filter @larpdb/api dev

# Web logs (Next.js — RSC errors, server action errors)
pnpm --filter @larpdb/web dev
```

To persist API logs to a file:

```bash
pnpm --filter @larpdb/api dev 2>&1 | tee api.log
```

## Monitoring

**Error tracking and performance** — [Sentry](https://sentry.io). Create two projects (`larpdb-api` and `larpdb-web`). Set env vars per service: API service gets `SENTRY_DSN`; web service gets `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` (the last three are build-time vars for source map uploads). Alert rules (first-seen issue + volume spike → email) are configured in the Sentry dashboard per project.

**Uptime monitoring** — [BetterStack](https://betterstack.com/uptime). Create two monitors in the BetterStack dashboard:

| Monitor | URL | Interval | Alert after |
|---------|-----|----------|-------------|
| API | `https://<railway-api-domain>/health` | 30s | 2 consecutive failures |
| Web | `https://<railway-web-domain>/` | 30s | 2 consecutive failures |

Set alert contact to `webdevmeg@gmail.com` on both. No SDK or code changes are needed for BetterStack — it's a pure HTTP check against the health endpoint built in this feature.

## Tests

```bash
pnpm --filter @larpdb/api test
```

Tests run against a live PostgreSQL database (`larpdb_test`). The database must be created manually before running tests for the first time:

```bash
createdb larpdb_test
```

Migrations are applied automatically before the suite runs. All data is deleted between test cases; the database itself is never dropped.

## Project structure

```
apps/
  api/                  Fastify API server
    src/
      db/               Drizzle schema, migrations, seed, templates
      lib/              Shared utilities (roles, progression, character validation)
      plugins/          JWT auth, game context middleware
      routes/           One file per resource:
                          admin, auth, character, characterSchema, characterXp,
                          event, game, gameMember, gamePublic, health,
                          npc, plot, post, profile, schemaTemplate,
                          store, subscription, upload, user
    drizzle/            Migration SQL files
    uploads/            Local file storage (dev only — swap for object storage in prod)
  web/                  Next.js frontend
    src/
      app/
        (app)/          Authenticated app shell
          admin/        Owner-only pages:
                          schemas/      Schema builder and versioning
                          site-config/  Identity, rulebook, codex, store, builds
                          users/        Member management
                          posts/        Post creation
          adventures/   Adventure builder (create, edit, branding, schema, classes)
          characters/   Character list, detail, and creation
          events/       Event list and detail
          dashboard/
          help/
          npcs/
          profile/
          rulebook/
          sys-admin/    Sys_admin-only tools
        browse/         Public game discovery
        larps/[slug]/   Public per-game landing page
        login/
        setup/
      components/
        character/      CharacterSheet, CharacterForm, XPCostBar, XPConfirmDialog
        schema-builder/ FieldEditor, FieldList, FieldPalette, SchemaBuilder, SchemaPreview
        posts/          PostCard, CommentList, LikeButton
        layout/         AppShell, Sidebar
        ui/             shadcn/ui primitives
      providers/
packages/
  shared/               Shared TypeScript types, Zod schemas, API client, XP utilities
```

---

Source available for review. All rights reserved — see Megan Petty.
