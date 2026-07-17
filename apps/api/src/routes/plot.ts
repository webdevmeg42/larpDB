import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { plots } from '../db/schema.js'
import { CreatePlotInput, UpdatePlotInput } from '@plotrunner/shared'
import { gmOrOwner, buildPatch } from '../lib/roles.js'

export const plotRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/plots',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to list plots")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const rows = await db.select().from(plots).where(eq(plots.gameId, request.gameContext.gameId)).orderBy(plots.createdAt)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/plots/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to view plot")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const { id } = request.params as { id: string }
      const [plot] = await db.select().from(plots).where(and(eq(plots.id, id), eq(plots.gameId, request.gameContext.gameId))).limit(1)
      if (!plot) {
        request.log.warn({ id, gameId: request.gameContext.gameId }, "plot not found")
        return reply.status(404).send({ error: 'Plot not found' })
      }
      return reply.send(plot)
    },
  )

  fastify.post(
    '/plots',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to create plot")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
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
      request.log.info({ id: plot!.id, title: plot!.title, gameId: request.gameContext.gameId }, "plot created")
      return reply.status(201).send(plot)
    },
  )

  fastify.patch(
    '/plots/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to update plot")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const { id } = request.params as { id: string }
      const result = UpdatePlotInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      const [updated] = await db.update(plots)
        .set(buildPatch(result.data) as Parameters<ReturnType<typeof db.update<typeof plots>>['set']>[0])
        .where(and(eq(plots.id, id), eq(plots.gameId, request.gameContext.gameId)))
        .returning()
      if (!updated) {
        request.log.warn({ id, gameId: request.gameContext.gameId }, "plot not found for update")
        return reply.status(404).send({ error: 'Plot not found' })
      }
      return reply.send(updated)
    },
  )

  fastify.delete(
    '/plots/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to delete plot")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const { id } = request.params as { id: string }
      const deleted = await db.delete(plots)
        .where(and(eq(plots.id, id), eq(plots.gameId, request.gameContext.gameId)))
        .returning({ id: plots.id })
      if (!deleted.length) {
        request.log.warn({ id, gameId: request.gameContext.gameId }, "plot not found for delete")
        return reply.status(404).send({ error: 'Plot not found' })
      }
      request.log.info({ id, gameId: request.gameContext.gameId }, "plot deleted")
      return reply.status(204).send()
    },
  )
}
