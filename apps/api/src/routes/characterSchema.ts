import type { FastifyPluginAsync } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { characterSchemas } from '../db/schema.js'
import type { SchemaField } from '@plotrunner/shared'
import { CreateCharacterSchemaInput, UpdateCharacterSchemaInput } from '@plotrunner/shared'

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
      if (!row) {
        request.log.warn({ id, gameId }, "character schema not found")
        return reply.status(404).send({ error: 'Schema not found' })
      }
      return reply.send(row)
    },
  )

  fastify.post(
    '/character-schemas',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { userId, gameId, role } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ userId, role, gameId }, "non-owner tried to create character schema")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const result = CreateCharacterSchemaInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(422).send({ error: 'Invalid input', details: result.error.flatten() })
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

      request.log.info({ id: schema!.id, name: schema!.name, type: schema!.type, gameId }, "character schema created")
      return reply.status(201).send(schema)
    },
  )

  fastify.patch(
    '/character-schemas/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { userId, gameId, role } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ userId, role, gameId }, "non-owner tried to update character schema")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(characterSchemas).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).limit(1)
      if (!existing) {
        request.log.warn({ id, gameId }, "character schema not found")
        return reply.status(404).send({ error: 'Schema not found' })
      }

      const result = UpdateCharacterSchemaInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(422).send({ error: 'Invalid input', details: result.error.flatten() })
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

      request.log.info({ id: newVersion!.id, gameId }, "character schema updated")
      return reply.status(201).send(newVersion)
    },
  )

  fastify.post(
    '/character-schemas/:id/activate',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { userId, gameId, role } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ userId, role, gameId }, "non-owner tried to activate character schema")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }

      const [schema] = await db
        .select({ id: characterSchemas.id, gameId: characterSchemas.gameId, type: characterSchemas.type })
        .from(characterSchemas)
        .where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId)))
        .limit(1)
      if (!schema) {
        request.log.warn({ id, gameId }, "character schema not found")
        return reply.status(404).send({ error: 'Schema not found' })
      }

      const [activated] = await db.transaction(async (tx) => {
        // Deactivate all schemas of the same type in this game
        await tx
          .update(characterSchemas)
          .set({ isActive: false })
          .where(and(eq(characterSchemas.gameId, gameId), eq(characterSchemas.type, schema.type)))

        // Activate the target
        const [updated] = await tx
          .update(characterSchemas)
          .set({ isActive: true })
          .where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId)))
          .returning()
        return [updated]
      })

      return reply.send(activated)
    },
  )

  fastify.post(
    '/character-schemas/:id/deactivate',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { userId, gameId, role } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ userId, role, gameId }, "non-owner tried to deactivate character schema")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }

      const [deactivated] = await db
        .update(characterSchemas)
        .set({ isActive: false })
        .where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId)))
        .returning()

      if (!deactivated) {
        request.log.warn({ id, gameId }, "character schema not found")
        return reply.status(404).send({ error: 'Schema not found' })
      }
      return reply.send(deactivated)
    },
  )

  fastify.delete(
    '/character-schemas/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { userId, gameId, role } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ userId, role, gameId }, "non-owner tried to delete character schema")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const [target] = await db.select().from(characterSchemas).where(and(eq(characterSchemas.id, id), eq(characterSchemas.gameId, gameId))).limit(1)
      if (!target) {
        request.log.warn({ id, gameId }, "character schema not found")
        return reply.status(404).send({ error: 'Schema not found' })
      }

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
