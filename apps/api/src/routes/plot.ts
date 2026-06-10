import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { plots } from '../db/schema.js'
import { CreatePlotInput, UpdatePlotInput } from '@larpdb/shared'
import { gmOrOwner, buildPatch } from '../lib/roles.js'

export const plotRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/plots',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const rows = await db.select().from(plots).where(eq(plots.gameId, request.gameContext.gameId)).orderBy(plots.createdAt)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/plots/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const { id } = request.params as { id: string }
      const [plot] = await db.select().from(plots).where(and(eq(plots.id, id), eq(plots.gameId, request.gameContext.gameId))).limit(1)
      if (!plot) return reply.status(404).send({ error: 'Plot not found' })
      return reply.send(plot)
    },
  )

  fastify.post(
    '/plots',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const result = CreatePlotInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      const [plot] = await db.insert(plots).values({
        gameId: request.gameContext.gameId,
        title: result.data.title,
        description: result.data.description ?? null,
        linkedEventIds: result.data.linkedEventIds,
        createdBy: request.gameContext.userId,
        status: 'active',
      }).returning()
      return reply.status(201).send(plot)
    },
  )

  fastify.patch(
    '/plots/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const { id } = request.params as { id: string }
      const result = UpdatePlotInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      const [updated] = await db.update(plots)
        .set(buildPatch(result.data) as Parameters<ReturnType<typeof db.update<typeof plots>>['set']>[0])
        .where(and(eq(plots.id, id), eq(plots.gameId, request.gameContext.gameId)))
        .returning()
      if (!updated) return reply.status(404).send({ error: 'Plot not found' })
      return reply.send(updated)
    },
  )

  fastify.delete(
    '/plots/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const { id } = request.params as { id: string }
      const deleted = await db.delete(plots)
        .where(and(eq(plots.id, id), eq(plots.gameId, request.gameContext.gameId)))
        .returning({ id: plots.id })
      if (!deleted.length) return reply.status(404).send({ error: 'Plot not found' })
      return reply.status(204).send()
    },
  )
}
