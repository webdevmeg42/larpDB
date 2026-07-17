import type { FastifyPluginAsync } from 'fastify'
import { eq, and, asc, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import { npcs, game, gameMembers } from '../db/schema.js'
import { CreateNpcInput, UpdateNpcInput } from '@plotrunner/shared'
import { gmOrOwner, buildPatch } from '../lib/roles.js'

export const npcRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/npcs',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to list NPCs")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const rows = await db.select().from(npcs).where(eq(npcs.gameId, request.gameContext.gameId)).orderBy(npcs.createdAt)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/npcs/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to view NPC")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const { id } = request.params as { id: string }
      const [npc] = await db.select().from(npcs).where(and(eq(npcs.id, id), eq(npcs.gameId, request.gameContext.gameId))).limit(1)
      if (!npc) {
        request.log.warn({ id, gameId: request.gameContext.gameId }, "npc not found")
        return reply.status(404).send({ error: 'NPC not found' })
      }
      return reply.send(npc)
    },
  )

  fastify.post(
    '/npcs',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to create NPC")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const result = CreateNpcInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      const [npc] = await db.insert(npcs).values({
        gameId: request.gameContext.gameId,
        name: result.data.name,
        description: result.data.description ?? null,
        portraitUrl: result.data.portraitUrl ?? null,
        notes: result.data.notes ?? null,
        createdBy: request.gameContext.userId,
      }).returning()
      request.log.info({ id: npc!.id, name: npc!.name, gameId: request.gameContext.gameId }, "npc created")
      return reply.status(201).send(npc)
    },
  )

  fastify.patch(
    '/npcs/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to update NPC")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const { id } = request.params as { id: string }
      const result = UpdateNpcInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      const [updated] = await db.update(npcs)
        .set(buildPatch(result.data) as Parameters<ReturnType<typeof db.update<typeof npcs>>['set']>[0])
        .where(and(eq(npcs.id, id), eq(npcs.gameId, request.gameContext.gameId)))
        .returning()
      if (!updated) {
        request.log.warn({ id, gameId: request.gameContext.gameId }, "npc not found for update")
        return reply.status(404).send({ error: 'NPC not found' })
      }
      return reply.send(updated)
    },
  )

  fastify.delete(
    '/npcs/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to delete NPC")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const { id } = request.params as { id: string }
      const deleted = await db.delete(npcs)
        .where(and(eq(npcs.id, id), eq(npcs.gameId, request.gameContext.gameId)))
        .returning({ id: npcs.id })
      if (!deleted.length) {
        request.log.warn({ id, gameId: request.gameContext.gameId }, "npc not found for delete")
        return reply.status(404).send({ error: 'NPC not found' })
      }
      request.log.info({ id, gameId: request.gameContext.gameId }, "npc deleted")
      return reply.status(204).send()
    },
  )

  fastify.get(
    '/my-npcs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub

      const rows = await db
        .select({
          gameId: game.id,
          gameName: game.name,
          gameSlug: game.slug,
          gameStatus: game.status,
          npcId: npcs.id,
          npcName: npcs.name,
          npcDescription: npcs.description,
        })
        .from(gameMembers)
        .innerJoin(game, eq(game.id, gameMembers.gameId))
        .leftJoin(npcs, eq(npcs.gameId, game.id))
        .where(and(
          eq(gameMembers.userId, userId),
          eq(gameMembers.status, 'active'),
          inArray(gameMembers.role, ['owner', 'gm']),
        ))
        .orderBy(asc(game.name), asc(npcs.createdAt))

      const gameMap = new Map<string, {
        id: string
        name: string
        slug: string
        isActive: boolean
        npcs: { id: string; name: string; description: string | null }[]
      }>()

      for (const row of rows) {
        if (!gameMap.has(row.gameId)) {
          gameMap.set(row.gameId, {
            id: row.gameId,
            name: row.gameName,
            slug: row.gameSlug,
            isActive: row.gameStatus === 'active',
            npcs: [],
          })
        }
        if (row.npcId) {
          gameMap.get(row.gameId)!.npcs.push({
            id: row.npcId,
            name: row.npcName!,
            description: row.npcDescription,
          })
        }
      }

      return reply.send({ games: Array.from(gameMap.values()) })
    },
  )
}
