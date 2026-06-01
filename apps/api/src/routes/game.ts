import type { FastifyPluginAsync } from 'fastify'
import { eq, count } from 'drizzle-orm'
import { db } from '../db/index.js'
import { game, gameMembers, siteConfig } from '../db/schema.js'
import { CreateGameInput, UpdateSiteConfigInput } from '@larpdb/shared'

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
  // Public: list all public games
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
      .where(eq(game.isPublic, true))
      .groupBy(game.id)
    return reply.send(rows)
  })

  // Public: get single game by slug
  fastify.get('/games/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const [row] = await db.select().from(game).where(eq(game.slug, slug)).limit(1)
    if (!row) return reply.status(404).send({ error: 'Game not found' })
    return reply.send(row)
  })

  // Authenticated: create a new game (caller becomes owner)
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

  // Game-context: get this game's info
  fastify.get(
    '/game',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const [row] = await db.select().from(game).where(eq(game.id, request.gameContext.gameId)).limit(1)
      if (!row) return reply.status(404).send({ error: 'Game not found' })
      return reply.send(row)
    },
  )

  // Public: get config by X-Game-Id header (no auth required)
  fastify.get('/config', async (request, reply) => {
    const gameId = request.headers['x-game-id'] as string | undefined
    if (!gameId) return reply.status(400).send({ error: 'X-Game-Id header required' })

    const [configRow] = await db.select().from(siteConfig).where(eq(siteConfig.gameId, gameId)).limit(1)
    if (!configRow) return reply.status(404).send({ error: 'Site config not found' })
    return reply.send(configRow)
  })

  // Game-context: update site config (owner only)
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

      const patch = Object.fromEntries(
        Object.entries({ ...result.data, updatedAt: new Date() }).filter(([, v]) => v !== undefined),
      ) as Parameters<ReturnType<typeof db.update<typeof siteConfig>>['set']>[0]

      const [updated] = await db
        .update(siteConfig)
        .set(patch)
        .where(eq(siteConfig.id, existing.id))
        .returning()

      return reply.send(updated)
    },
  )
}
