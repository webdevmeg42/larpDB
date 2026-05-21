import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { plots } from '../db/schema.js'
import { CreatePlotInput, UpdatePlotInput } from '@larpdb/shared'
import { gmOrOwner } from '../lib/roles.js'

export const plotRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/plots',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const rows = await db.select().from(plots).orderBy(plots.createdAt)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/plots/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const { id } = request.params as { id: string }
      const [plot] = await db.select().from(plots).where(eq(plots.id, id)).limit(1)
      if (!plot) return reply.status(404).send({ error: 'Plot not found' })
      return reply.send(plot)
    },
  )

  fastify.post(
    '/plots',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const result = CreatePlotInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [plot] = await db.insert(plots).values({
        title: result.data.title,
        description: result.data.description ?? null,
        linkedEventIds: result.data.linkedEventIds,
        createdBy: request.user.sub,
        status: 'active',
      }).returning()

      return reply.status(201).send(plot)
    },
  )

  fastify.patch(
    '/plots/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(plots).where(eq(plots.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Plot not found' })

      const result = UpdatePlotInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const patch = Object.fromEntries(
        Object.entries(result.data).filter(([, v]) => v !== undefined),
      ) as Parameters<ReturnType<typeof db.update<typeof plots>>['set']>[0]

      const [updated] = await db
        .update(plots)
        .set(patch)
        .where(eq(plots.id, id))
        .returning()

      return reply.send(updated)
    },
  )

  fastify.delete(
    '/plots/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(plots).where(eq(plots.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Plot not found' })

      await db.delete(plots).where(eq(plots.id, id))
      return reply.status(204).send()
    },
  )
}
