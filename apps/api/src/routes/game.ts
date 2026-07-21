import type { FastifyPluginAsync } from 'fastify'
import { eq, count, and, or, inArray, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '../db/index.js'
import {
  game,
  gameMembers,
  siteConfig,
  schemaTemplates,
  characterSchemas,
  characters,
  xpTransactions,
  events,
  eventRegistrations,
  storeItems,
  purchases,
  npcs,
  plots,
} from '../db/schema.js'
import { CreateGameInput, UpdateSiteConfigInput, UpdateGameStatusInput, generateSlug } from '@plotrunner/shared'
import { buildPatch } from '../lib/roles.js'
import { parsePagination } from '../lib/pagination.js'

async function fetchPublicGameCodex(slug: string) {
  const [row] = await db
    .select({ codex: siteConfig.codex })
    .from(game)
    .leftJoin(siteConfig, eq(siteConfig.gameId, game.id))
    .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
    .limit(1)
  return row ?? null
}

async function fetchPublicSchemas(slug: string, type: 'race' | 'class') {
  const rows = await db
    .select({
      id: characterSchemas.id,
      name: characterSchemas.name,
      type: characterSchemas.type,
      fields: characterSchemas.fields,
      gameId: characterSchemas.gameId,
    })
    .from(characterSchemas)
    .innerJoin(game, eq(game.id, characterSchemas.gameId))
    .where(
      and(
        eq(game.slug, slug),
        eq(game.isPublic, true),
        eq(game.status, 'active'),
        eq(characterSchemas.isActive, true),
        eq(characterSchemas.type, type),
      ),
    )
  return rows.length > 0 ? rows : null
}

// No max-attempts cap here — after the first DB check finds a free slug, collisions
// on subsequent attempts would require an exact match including the numeric suffix,
// which is astronomically unlikely. A cap would add complexity for no real protection.
async function uniqueSlug(base: string): Promise<string> {
  let attempt = 0
  while (true) {
    const candidate = attempt === 0 ? base : `${base}-${attempt}`
    const [existing] = await db.select({ id: game.id }).from(game).where(eq(game.slug, candidate)).limit(1)
    if (!existing) return candidate
    attempt++
  }
}

const ERR_INVALID_SLUG = 'Adventure name must contain at least one letter or number'

async function requireOwner(gameId: string, userId: string) {
  const [member] = await db
    .select()
    .from(gameMembers)
    .where(
      and(
        eq(gameMembers.gameId, gameId),
        eq(gameMembers.userId, userId),
        eq(gameMembers.status, 'active'),
      ),
    )
    .limit(1)
  return member?.role === 'owner' ? member : null
}

export const gameRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/games', async (request, reply) => {
    const { limit: limitN, offset: offsetN } = parsePagination(
      request.query as { limit?: string; offset?: string },
      { limit: 100, maxLimit: 200 },
    )

    const filter = and(eq(game.isPublic, true), eq(game.status, 'active'))

    const [{ total }] = await db.select({ total: count() }).from(game).where(filter)

    const items = await db
      .select({
        id: game.id,
        name: game.name,
        description: game.description,
        slug: game.slug,
        joinMode: game.joinMode,
        createdAt: game.createdAt,
        memberCount: count(gameMembers.id),
      })
      .from(game)
      .leftJoin(gameMembers, and(eq(gameMembers.gameId, game.id), eq(gameMembers.status, 'active')))
      .where(filter)
      .groupBy(game.id)
      .limit(limitN)
      .offset(offsetN)

    return reply.send({ items, total, limit: limitN, offset: offsetN })
  })

  fastify.get('/games/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const [row] = await db.select().from(game).where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active'))).limit(1)
    if (!row) return reply.status(404).send({ error: 'Game not found' })
    return reply.send(row)
  })

  fastify.get(
    '/my-games',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub
      const myMembership = alias(gameMembers, 'my_membership')
      const allMemberships = alias(gameMembers, 'all_memberships')

      const rows = await db
        .select({
          id: game.id,
          name: game.name,
          description: game.description,
          slug: game.slug,
          isPublic: game.isPublic,
          joinMode: game.joinMode,
          status: game.status,
          createdAt: game.createdAt,
          memberCount: count(allMemberships.id),
          role: myMembership.role,
        })
        .from(game)
        .innerJoin(
          myMembership,
          and(
            eq(myMembership.gameId, game.id),
            eq(myMembership.userId, userId),
            eq(myMembership.status, 'active'),
          ),
        )
        .leftJoin(
          allMemberships,
          and(
            eq(allMemberships.gameId, game.id),
            eq(allMemberships.status, 'active'),
          ),
        )
        .where(
          or(
            eq(game.status, 'active'),
            and(eq(game.status, 'inactive'), eq(myMembership.role, 'owner')),
          ),
        )
        .groupBy(game.id, myMembership.role)
        .orderBy(game.createdAt)

      return reply.send(rows)
    },
  )

  fastify.get(
    '/games/check-name',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { name, excludeId } = request.query as { name?: string; excludeId?: string }
      if (!name || typeof name !== 'string' || !name.trim()) {
        return reply.status(400).send({ error: 'name is required' })
      }
      if (!generateSlug(name.trim())) {
        return reply.status(400).send({ error: ERR_INVALID_SLUG })
      }
      const condition = excludeId
        ? and(sql`LOWER(${game.name}) = LOWER(${name.trim()})`, ne(game.id, excludeId))
        : sql`LOWER(${game.name}) = LOWER(${name.trim()})`
      const [existing] = await db.select({ id: game.id }).from(game).where(condition).limit(1)
      return reply.send({ available: !existing })
    },
  )

  fastify.post(
    '/games',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = CreateGameInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const userId = request.user.sub
      const baseSlug = generateSlug(result.data.name)

      if (!baseSlug) {
        request.log.warn({ name: result.data.name }, "adventure name produces an empty slug, rejecting")
        return reply.status(400).send({ error: ERR_INVALID_SLUG })
      }

      // 'check-name' is reserved because GET /games/check-name is a static route that Fastify
      // resolves before the parameterized GET /games/:slug — a game that slugged to 'check-name'
      // would permanently lose access to its own public URL
      const RESERVED_SLUGS = new Set(['check-name'])
      if (RESERVED_SLUGS.has(baseSlug)) {
        request.log.warn({ name: result.data.name, slug: baseSlug }, "adventure name conflicts with a reserved path")
        return reply.status(400).send({ error: 'Adventure name conflicts with a reserved path' })
      }

      let newGame: typeof game.$inferSelect | undefined
      for (let attempt = 0; attempt < 5 && !newGame; attempt++) {
        const slug = attempt === 0 ? await uniqueSlug(baseSlug) : `${baseSlug}-${attempt}`
        try {
          newGame = await db.transaction(async (tx) => {
            const [created] = await tx.insert(game).values({
              name: result.data.name,
              description: result.data.description ?? null,
              slug,
              isPublic: result.data.isPublic ?? true,
              joinMode: result.data.joinMode ?? 'open',
              status: 'inactive',
            }).returning()
            if (!created) throw new Error('Failed to create game')

            await tx.insert(gameMembers).values({
              gameId: created.id,
              userId,
              role: 'owner',
              status: 'active',
            })

            await tx.insert(siteConfig).values({
              gameId: created.id,
              siteTitle: created.name,
            })

            return created
          })
        } catch (err: unknown) {
          // 23505 is PostgreSQL's unique_violation error code
          const pgErr = err as { code?: string; constraint?: string }
          if (pgErr.code !== '23505') throw err
          if (pgErr.constraint === 'game_name_lower_idx') {
            request.log.warn({ name: result.data.name }, "adventure name already taken")
            return reply.status(400).send({ error: 'Adventure name already taken' })
          }
          if (attempt >= 4) throw err
        }
      }
      if (!newGame) throw new Error('Failed to create game')

      request.log.info({ id: newGame.id, name: newGame.name, slug: newGame.slug }, "new adventure created")
      return reply.status(201).send(newGame)
    },
  )

  fastify.patch(
    '/games/:id/status',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const userId = request.user.sub

      const member = await requireOwner(id, userId)
      if (!member) {
        request.log.warn({ id, userId }, "non-owner tried to change adventure status")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const result = UpdateGameStatusInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [updated] = await db
        .update(game)
        .set({ status: result.data.status })
        .where(eq(game.id, id))
        .returning()

      if (!updated) return reply.status(404).send({ error: 'Game not found' })
      request.log.info({ id, status: result.data.status }, "adventure status changed")
      return reply.send(updated)
    },
  )

  fastify.patch(
    '/games/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const userId = request.user.sub

      const member = await requireOwner(id, userId)
      if (!member) {
        request.log.warn({ id, userId }, "non-owner tried to update adventure")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const schema = z.object({
        isPublic: z.boolean().optional(),
        name: z.string().min(1).max(150).optional(),
      })
      const result = schema.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const patch: Partial<typeof game.$inferInsert> = {}
      if (result.data.isPublic !== undefined) patch.isPublic = result.data.isPublic
      if (result.data.name !== undefined) {
        const trimmed = result.data.name.trim()
        if (!generateSlug(trimmed)) {
          return reply.status(400).send({ error: ERR_INVALID_SLUG })
        }
        patch.name = trimmed
      }
      if (Object.keys(patch).length === 0) {
        return reply.status(400).send({ error: 'No fields to update' })
      }

      let updated: typeof game.$inferSelect | undefined
      try {
        const rows = await db.update(game).set(patch).where(eq(game.id, id)).returning()
        updated = rows[0]
      } catch (err: unknown) {
        const pgErr = err as { code?: string; constraint?: string }
        if (pgErr.code === '23505' && pgErr.constraint === 'game_name_lower_idx') {
          request.log.warn({ id, name: result.data.name }, "patch rejected — adventure name already taken")
          return reply.status(400).send({ error: 'Adventure name already taken' })
        }
        throw err
      }

      if (!updated) return reply.status(404).send({ error: 'Game not found' })
      request.log.info({ id, ...patch }, "adventure updated")
      return reply.send(updated)
    },
  )

  fastify.delete(
    '/games/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const userId = request.user.sub

      const [member] = await db
        .select()
        .from(gameMembers)
        .where(
          and(
            eq(gameMembers.gameId, id),
            eq(gameMembers.userId, userId),
            eq(gameMembers.status, 'active'),
          ),
        )
        .limit(1)

      if (!member || member.role !== 'owner') {
        request.log.warn({ id, userId }, "non-owner tried to delete adventure")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      await db.transaction(async (tx) => {
        // adventure_subscriptions, posts, comments, and post_likes are handled by DB-level CASCADE on game_id FK
        // Use subqueries to avoid loading all IDs into memory for large games
        const eventSubquery = tx.select({ id: events.id }).from(events).where(eq(events.gameId, id))
        const charSubquery = tx.select({ id: characters.id }).from(characters).where(eq(characters.gameId, id))

        await Promise.all([
          tx.delete(purchases).where(inArray(purchases.eventId, eventSubquery)),
          tx.delete(storeItems).where(inArray(storeItems.eventId, eventSubquery)),
          tx.delete(eventRegistrations).where(inArray(eventRegistrations.eventId, eventSubquery)),
          tx.delete(xpTransactions).where(inArray(xpTransactions.characterId, charSubquery)),
        ])

        await tx.delete(characters).where(eq(characters.gameId, id))
        await tx.delete(events).where(eq(events.gameId, id))
        await tx.delete(npcs).where(eq(npcs.gameId, id))
        await tx.delete(plots).where(eq(plots.gameId, id))
        await tx.delete(characterSchemas).where(eq(characterSchemas.gameId, id))
        await tx.delete(schemaTemplates).where(eq(schemaTemplates.gameId, id))
        await tx.delete(siteConfig).where(eq(siteConfig.gameId, id))
        await tx.delete(gameMembers).where(eq(gameMembers.gameId, id))
        await tx.delete(game).where(eq(game.id, id))
      })

      request.log.info({ id }, "adventure and all its data deleted")
      return reply.status(204).send()
    },
  )

  fastify.get(
    '/game',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const [row] = await db.select().from(game).where(eq(game.id, request.gameContext.gameId)).limit(1)
      if (!row) return reply.status(404).send({ error: 'Game not found' })
      return reply.send(row)
    },
  )

  fastify.get('/config', async (request, reply) => {
    const gameId = request.headers['x-game-id'] as string | undefined
    if (!gameId) return reply.status(400).send({ error: 'X-Game-Id header required' })

    // Optional auth: authenticated members can access private game configs
    let isMember = false
    try {
      await request.jwtVerify()
      const userId = request.user.sub
      const [membership] = await db
        .select({ id: gameMembers.id })
        .from(gameMembers)
        .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId), eq(gameMembers.status, 'active')))
        .limit(1)
      if (membership) isMember = true
    } catch {
      // Not authenticated — fall through to public check
    }

    if (!isMember) {
      const [gameRow] = await db.select({ id: game.id }).from(game).where(and(eq(game.id, gameId), eq(game.isPublic, true))).limit(1)
      if (!gameRow) return reply.status(404).send({ error: 'Site config not found' })
    }

    const [configRow] = await db.select().from(siteConfig).where(eq(siteConfig.gameId, gameId)).limit(1)
    if (!configRow) return reply.status(404).send({ error: 'Site config not found' })
    return reply.send(configRow)
  })

  fastify.patch(
    '/config',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (request.gameContext.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const result = UpdateSiteConfigInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const updated = await db.transaction(async (tx) => {
        const [cfg] = await tx
          .update(siteConfig)
          .set({ ...buildPatch(result.data), updatedAt: new Date() })
          .where(eq(siteConfig.gameId, request.gameContext.gameId))
          .returning()
        if (!cfg) return null

        if (result.data.siteTitle !== undefined) {
          await tx
            .update(game)
            .set({ name: result.data.siteTitle })
            .where(eq(game.id, request.gameContext.gameId))
        }

        return cfg
      })

      if (!updated) return reply.status(404).send({ error: 'Site config not found' })
      return reply.send(updated)
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/public',
    async (request, reply) => {
      const { slug } = request.params
      const [row] = await db
        .select({
          id: game.id,
          name: game.name,
          slug: game.slug,
          joinMode: game.joinMode,
          status: game.status,
          siteTitle: siteConfig.siteTitle,
          tagline: siteConfig.tagline,
          logoUrl: siteConfig.logoUrl,
          bannerUrl: siteConfig.bannerUrl,
          welcomeMessage: siteConfig.welcomeMessage,
          showDirectory: siteConfig.showDirectory,
          codex: siteConfig.codex,
          colorPrimary: siteConfig.colorPrimary,
          colorSecondary: siteConfig.colorSecondary,
          colorBackground: siteConfig.colorBackground,
          colorText: siteConfig.colorText,
          colorAccent: siteConfig.colorAccent,
          fontHeading: siteConfig.fontHeading,
          fontBody: siteConfig.fontBody,
        })
        .from(game)
        .leftJoin(siteConfig, eq(siteConfig.gameId, game.id))
        .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
        .limit(1)

      if (!row) return reply.status(404).send({ error: 'Adventure not found' })

      const codexData = row.codex ?? {}
      const socialKeys = [
        'socialFacebook', 'socialInstagram', 'socialSnapchat', 'socialTikTok',
        'socialBluesky', 'socialSubstack', 'socialTwitter', 'socialDiscord',
      ] as const

      const socials: Record<string, string | undefined> = {}
      for (const key of socialKeys) {
        const val = (codexData as Record<string, unknown>)[key]
        if (typeof val === 'string' && val) socials[key] = val
      }

      const additionalWebsites = Array.isArray((codexData as Record<string, unknown>).additionalWebsites)
        ? (codexData as Record<string, unknown>).additionalWebsites
        : undefined

      return reply.send({
        id: row.id,
        name: row.name,
        slug: row.slug,
        joinMode: row.joinMode,
        status: row.status,
        siteTitle: row.siteTitle ?? row.name,
        tagline: row.tagline ?? null,
        logoUrl: row.logoUrl ?? null,
        bannerUrl: row.bannerUrl ?? null,
        welcomeMessage: row.welcomeMessage ?? null,
        showDirectory: row.showDirectory ?? false,
        colorPrimary: row.colorPrimary ?? '#6366f1',
        colorSecondary: row.colorSecondary ?? '#a78bfa',
        colorBackground: row.colorBackground ?? '#0f0f1a',
        colorText: row.colorText ?? '#ffffff',
        colorAccent: row.colorAccent ?? '#f59e0b',
        fontHeading: row.fontHeading ?? 'Inter',
        fontBody: row.fontBody ?? 'Inter',
        ...socials,
        ...(additionalWebsites ? { additionalWebsites } : {}),
      })
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/codex',
    async (request, reply) => {
      const row = await fetchPublicGameCodex(request.params.slug)
      if (!row) return reply.status(404).send({ error: 'Adventure not found' })
      return reply.send(row.codex ?? {})
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/rulebook',
    async (request, reply) => {
      const row = await fetchPublicGameCodex(request.params.slug)
      if (!row) return reply.status(404).send({ error: 'Adventure not found' })
      const codex = row.codex ?? {}
      return reply.send({
        rulebookLink: (codex as Record<string, unknown>).rulebookLink ?? null,
        chapters: (codex as Record<string, unknown>).rulebook
          ? ((codex as Record<string, unknown>).rulebook as { chapters: unknown[] }).chapters
          : [],
      })
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/store',
    async (request, reply) => {
      const { slug } = request.params
      const [gameRow] = await db
        .select({ id: game.id, currencyName: siteConfig.currencyName })
        .from(game)
        .leftJoin(siteConfig, eq(siteConfig.gameId, game.id))
        .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
        .limit(1)

      if (!gameRow) return reply.status(404).send({ error: 'Adventure not found' })

      const eventRows = await db
        .select({
          eventId: events.id,
          eventTitle: events.title,
          startAt: events.startAt,
          itemId: storeItems.id,
          itemName: storeItems.name,
          itemDescription: storeItems.description,
          itemPrice: storeItems.price,
          itemIsAvailable: storeItems.isAvailable,
        })
        .from(events)
        .innerJoin(storeItems, eq(storeItems.eventId, events.id))
        .where(and(eq(events.gameId, gameRow.id), eq(events.status, 'published')))
        .orderBy(events.startAt)

      const eventMap = new Map<string, {
        id: string
        title: string
        startDate: string | null
        items: { id: string; name: string; description: string | null; price: number; isAvailable: boolean }[]
      }>()

      for (const r of eventRows) {
        if (!eventMap.has(r.eventId)) {
          eventMap.set(r.eventId, {
            id: r.eventId,
            title: r.eventTitle,
            startDate: r.startAt ? r.startAt.toISOString() : null,
            items: [],
          })
        }
        eventMap.get(r.eventId)!.items.push({
          id: r.itemId,
          name: r.itemName,
          description: r.itemDescription ?? null,
          price: r.itemPrice,
          isAvailable: r.itemIsAvailable,
        })
      }

      return reply.send({
        currencyName: gameRow.currencyName ?? 'monies',
        events: [...eventMap.values()].filter(e => e.items.length > 0),
      })
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/schemas/race',
    async (request, reply) => {
      const schemas = await fetchPublicSchemas(request.params.slug, 'race')
      if (!schemas) return reply.status(404).send({ error: 'Adventure not found' })
      return reply.send(schemas)
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/schemas/class',
    async (request, reply) => {
      const schemas = await fetchPublicSchemas(request.params.slug, 'class')
      if (!schemas) return reply.status(404).send({ error: 'Adventure not found' })
      return reply.send(schemas)
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/membership',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { slug } = request.params
      const userId = request.user.sub

      const [gameRow] = await db
        .select({ id: game.id })
        .from(game)
        .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
        .limit(1)

      if (!gameRow) return reply.status(404).send({ error: 'Adventure not found' })

      const [member] = await db
        .select({ id: gameMembers.id })
        .from(gameMembers)
        .where(and(
          eq(gameMembers.gameId, gameRow.id),
          eq(gameMembers.userId, userId),
          eq(gameMembers.status, 'active'),
        ))
        .limit(1)

      return reply.send({ isMember: !!member })
    },
  )
}
