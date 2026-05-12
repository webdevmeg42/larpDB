import type { FastifyPluginAsync } from 'fastify'
import { eq, ne } from 'drizzle-orm'
import { db } from '../db/index.js'
import { characterSchemas } from '../db/schema.js'
import { CreateCharacterSchemaInput, UpdateCharacterSchemaInput } from '@larpdb/shared'

export const characterSchemaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/character-schemas',
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      const rows = await db.select().from(characterSchemas).orderBy(characterSchemas.createdAt)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/character-schemas/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const [row] = await db.select().from(characterSchemas).where(eq(characterSchemas.id, id)).limit(1)
      if (!row) return reply.status(404).send({ error: 'Schema not found' })
      return reply.send(row)
    },
  )

  fastify.post(
    '/character-schemas',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const result = CreateCharacterSchemaInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [schema] = await db.insert(characterSchemas).values({
        name: result.data.name,
        fields: result.data.fields,
        templateSource: result.data.templateSource ?? null,
        version: 1,
        isActive: false,
      }).returning()

      return reply.status(201).send(schema)
    },
  )

  fastify.patch(
    '/character-schemas/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(characterSchemas).where(eq(characterSchemas.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Schema not found' })

      const result = UpdateCharacterSchemaInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [newVersion] = await db.insert(characterSchemas).values({
        name: result.data.name ?? existing.name,
        fields: result.data.fields ?? existing.fields,
        templateSource: existing.templateSource,
        version: existing.version + 1,
        isActive: false,
      }).returning()

      return reply.status(201).send(newVersion)
    },
  )

  fastify.post(
    '/character-schemas/:id/activate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const [target] = await db.select().from(characterSchemas).where(eq(characterSchemas.id, id)).limit(1)
      if (!target) return reply.status(404).send({ error: 'Schema not found' })

      await db.update(characterSchemas).set({ isActive: false }).where(ne(characterSchemas.id, id))
      const [activated] = await db.update(characterSchemas).set({ isActive: true }).where(eq(characterSchemas.id, id)).returning()

      return reply.send(activated)
    },
  )
}
