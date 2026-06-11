import type { FastifyPluginAsync } from 'fastify'
import { eq, count, and, or, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
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
import { CreateGameInput, UpdateSiteConfigInput, UpdateGameStatusInput } from '@larpdb/shared'
import { buildPatch } from '../lib/roles.js'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

async function uniqueSlug(base: string): Promise<string> {
  let attempt = 0
  while (true) {
    const candidate = attempt === 0 ? base : `${base}-${attempt}`
    const [existing] = await db.select().from(game).where(eq(game.slug, candidate)).limit(1)
    if (!existing) return candidate
    attempt++
  }
}

export const gameRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/games', async (_request, reply) => {
    const rows = await db
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
      .leftJoin(gameMembers, eq(gameMembers.gameId, game.id))
      .where(and(eq(game.isPublic, true), eq(game.status, 'active')))
      .groupBy(game.id)
    return reply.send(rows)
  })

  fastify.get('/games/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const [row] = await db.select().from(game).where(eq(game.slug, slug)).limit(1)
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
            and(eq(game.status, 'disabled'), eq(myMembership.role, 'owner')),
          ),
        )
        .groupBy(game.id, myMembership.role)
        .orderBy(game.createdAt)

      return reply.send(rows)
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

      const baseSlug = generateSlug(result.data.name)
      const slug = await uniqueSlug(baseSlug)

      const [newGame] = await db.insert(game).values({
        name: result.data.name,
        description: result.data.description ?? null,
        slug,
        isPublic: result.data.isPublic ?? true,
        joinMode: result.data.joinMode ?? 'open',
      }).returning()
      if (!newGame) throw new Error('Failed to create game')

      await db.insert(gameMembers).values({
        gameId: newGame.id,
        userId: request.user.sub,
        role: 'owner',
        status: 'active',
      })

      await db.insert(siteConfig).values({
        gameId: newGame.id,
        siteTitle: newGame.name,
      })

      return reply.status(201).send(newGame)
    },
  )

  fastify.patch(
    '/games/:id/status',
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
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const [existing] = await db.select({ id: game.id }).from(game).where(eq(game.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Game not found' })

      await db.transaction(async (tx) => {
        const gameEvents = await tx
          .select({ id: events.id })
          .from(events)
          .where(eq(events.gameId, id))
        const eventIds = gameEvents.map(e => e.id)

        const gameChars = await tx
          .select({ id: characters.id })
          .from(characters)
          .where(eq(characters.gameId, id))
        const charIds = gameChars.map(c => c.id)

        if (eventIds.length > 0) {
          await tx.delete(purchases).where(inArray(purchases.eventId, eventIds))
          await tx.delete(storeItems).where(inArray(storeItems.eventId, eventIds))
          await tx.delete(eventRegistrations).where(inArray(eventRegistrations.eventId, eventIds))
        }
        if (charIds.length > 0) {
          await tx.delete(xpTransactions).where(inArray(xpTransactions.characterId, charIds))
        }

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

      const [existing] = await db
        .select()
        .from(siteConfig)
        .where(eq(siteConfig.gameId, request.gameContext.gameId))
        .limit(1)
      if (!existing) return reply.status(404).send({ error: 'Site config not found' })

      const [updated] = await db
        .update(siteConfig)
        .set({ ...buildPatch(result.data), updatedAt: new Date() })
        .where(eq(siteConfig.id, existing.id))
        .returning()

      return reply.send(updated)
    },
  )
}
