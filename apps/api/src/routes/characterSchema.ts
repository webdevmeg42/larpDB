import type { FastifyPluginAsync } from 'fastify'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '../db/index.js'
import { characterSchemas } from '../db/schema.js'
import type { SchemaField } from '@larpdb/shared'
import { CreateCharacterSchemaInput, UpdateCharacterSchemaInput } from '@larpdb/shared'

export const characterSchemaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/character-schemas',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId } = request.gameContext
      const rows = await db.select().from(characterSchemas).where(eq(characterSchemas.gameId, gameId)).orderBy(characterSchemas.createdAt)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/character-schemas/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId } = request.gameContext
      const { id } = request.params as { id: string }
      const [row] = await db.select().from(characterSchemas).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).limit(1)
      if (!row) return reply.status(404).send({ error: 'Schema not found' })
      return reply.send(row)
    },
  )

  fastify.post(
    '/character-schemas',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (request.gameContext.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { gameId } = request.gameContext

      const result = CreateCharacterSchemaInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [schema] = await db.insert(characterSchemas).values({
        gameId,
        name: result.data.name,
        fields: result.data.fields as SchemaField[],
        templateSource: result.data.templateSource ?? null,
        type: result.data.type,
        version: 1,
        isActive: false,
      }).returning()

      return reply.status(201).send(schema)
    },
  )

  fastify.patch(
    '/character-schemas/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (request.gameContext.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { gameId } = request.gameContext
      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(characterSchemas).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Schema not found' })

      const result = UpdateCharacterSchemaInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [newVersion] = await db.insert(characterSchemas).values({
        gameId,
        name: result.data.name ?? existing.name,
        fields: (result.data.fields ?? existing.fields) as SchemaField[],
        templateSource: existing.templateSource,
        type: existing.type,
        version: existing.version + 1,
        isActive: false,
      }).returning()

      return reply.status(201).send(newVersion)
    },
  )

  fastify.post(
    '/character-schemas/:id/activate',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (request.gameContext.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { gameId } = request.gameContext
      const { id } = request.params as { id: string }
      const [target] = await db.select().from(characterSchemas).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).limit(1)
      if (!target) return reply.status(404).send({ error: 'Schema not found' })

      const [activated] = await db.transaction(async (tx) => {
        await tx.update(characterSchemas).set({ isActive: false }).where(and(ne(characterSchemas.id, id), eq(characterSchemas.gameId, gameId), eq(characterSchemas.type, target.type)))
        return tx.update(characterSchemas).set({ isActive: true }).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).returning()
      })

      return reply.send(activated)
    },
  )

  fastify.post(
    '/character-schemas/:id/deactivate',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (request.gameContext.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { gameId } = request.gameContext
      const { id } = request.params as { id: string }
      const [target] = await db.select().from(characterSchemas).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).limit(1)
      if (!target) return reply.status(404).send({ error: 'Schema not found' })

      const [deactivated] = await db.update(characterSchemas).set({ isActive: false }).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).returning()
      return reply.send(deactivated)
    },
  )

  fastify.delete(
    '/character-schemas/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (request.gameContext.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { gameId } = request.gameContext
      const { id } = request.params as { id: string }
      const [target] = await db.select().from(characterSchemas).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).limit(1)
      if (!target) return reply.status(404).send({ error: 'Schema not found' })

      if (target.isActive) {
        return reply.status(409).send({ error: 'Cannot delete the active schema. Deactivate it first.' })
      }

      try {
        await db.delete(characterSchemas).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId)))
      } catch {
        return reply.status(409).send({ error: 'Cannot delete this schema because characters are using it.' })
      }

      return reply.status(204).send()
    },
  )
}
