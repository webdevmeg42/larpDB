import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { npcs } from '../db/schema.js'
import { CreateNpcInput, UpdateNpcInput } from '@larpdb/shared'

export const npcRoutes: FastifyPluginAsync = async (fastify) => {
  const gmOrOwner = (role: string) => role === 'owner' || role === 'gm'

  fastify.get(
    '/npcs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const rows = await db.select().from(npcs).orderBy(npcs.createdAt)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/npcs/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }
      const { id } = request.params as { id: string }
      const [npc] = await db.select().from(npcs).where(eq(npcs.id, id)).limit(1)
      if (!npc) return reply.status(404).send({ error: 'NPC not found' })
      return reply.send(npc)
    },
  )

  fastify.post(
    '/npcs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const result = CreateNpcInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [npc] = await db.insert(npcs).values({
        name: result.data.name,
        description: result.data.description ?? null,
        portraitUrl: result.data.portraitUrl ?? null,
        notes: result.data.notes ?? null,
        createdBy: request.user.sub,
      }).returning()

      return reply.status(201).send(npc)
    },
  )

  fastify.patch(
    '/npcs/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(npcs).where(eq(npcs.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'NPC not found' })

      const result = UpdateNpcInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const setData: Record<string, unknown> = {}
      if (result.data.name !== undefined) setData['name'] = result.data.name
      if (result.data.description !== undefined) setData['description'] = result.data.description
      if (result.data.portraitUrl !== undefined) setData['portraitUrl'] = result.data.portraitUrl
      if (result.data.notes !== undefined) setData['notes'] = result.data.notes

      const [updated] = await db
        .update(npcs)
        .set(setData as Parameters<ReturnType<typeof db.update<typeof npcs>>['set']>[0])
        .where(eq(npcs.id, id))
        .returning()

      return reply.send(updated)
    },
  )

  fastify.delete(
    '/npcs/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!gmOrOwner(request.user.role)) {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(npcs).where(eq(npcs.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'NPC not found' })

      await db.delete(npcs).where(eq(npcs.id, id))
      return reply.status(204).send()
    },
  )
}
