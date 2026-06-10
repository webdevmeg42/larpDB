import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { npcs } from '../db/schema.js'
import { CreateNpcInput, UpdateNpcInput } from '@larpdb/shared'
import { gmOrOwner, buildPatch } from '../lib/roles.js'

export const npcRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/npcs',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const rows = await db.select().from(npcs).where(eq(npcs.gameId, request.gameContext.gameId)).orderBy(npcs.createdAt)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/npcs/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const { id } = request.params as { id: string }
      const [npc] = await db.select().from(npcs).where(and(eq(npcs.id, id), eq(npcs.gameId, request.gameContext.gameId))).limit(1)
      if (!npc) return reply.status(404).send({ error: 'NPC not found' })
      return reply.send(npc)
    },
  )

  fastify.post(
    '/npcs',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
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
      return reply.status(201).send(npc)
    },
  )

  fastify.patch(
    '/npcs/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const { id } = request.params as { id: string }
      const result = UpdateNpcInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      const [updated] = await db.update(npcs)
        .set(buildPatch(result.data) as Parameters<ReturnType<typeof db.update<typeof npcs>>['set']>[0])
        .where(and(eq(npcs.id, id), eq(npcs.gameId, request.gameContext.gameId)))
        .returning()
      if (!updated) return reply.status(404).send({ error: 'NPC not found' })
      return reply.send(updated)
    },
  )

  fastify.delete(
    '/npcs/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const { id } = request.params as { id: string }
      const deleted = await db.delete(npcs)
        .where(and(eq(npcs.id, id), eq(npcs.gameId, request.gameContext.gameId)))
        .returning({ id: npcs.id })
      if (!deleted.length) return reply.status(404).send({ error: 'NPC not found' })
      return reply.status(204).send()
    },
  )
}
