import type { FastifyPluginAsync } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { characters, characterSchemas, xpTransactions } from '../db/schema.js'
import { CreateCharacterInput, UpdateCharacterInput, AwardXPInput, SpendXPInput } from '@larpdb/shared'
import { validateCharacterData } from '../lib/validateCharacterData.js'

export const characterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/characters',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = CreateCharacterInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [activeSchema] = await db
        .select()
        .from(characterSchemas)
        .where(eq(characterSchemas.isActive, true))
        .limit(1)

      if (!activeSchema) {
        return reply.status(404).send({ error: 'No active character schema configured' })
      }

      const validationErrors = validateCharacterData(activeSchema.fields, result.data.data)
      if (validationErrors.length > 0) {
        return reply.status(400).send({ error: 'Character data is invalid', errors: validationErrors })
      }

      const [character] = await db.insert(characters).values({
        userId: request.user.sub,
        schemaId: activeSchema.id,
        name: result.data.name,
        portraitUrl: result.data.portraitUrl ?? null,
        data: result.data.data,
      }).returning()

      return reply.status(201).send(character)
    },
  )

  fastify.get(
    '/characters',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { role, sub } = request.user
      const rows = role === 'player'
        ? await db.select().from(characters).where(eq(characters.userId, sub))
        : await db.select().from(characters)
      return reply.send(rows)
    },
  )

  fastify.get(
    '/characters/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const [character] = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

      const { role, sub } = request.user
      if (role === 'player' && character.userId !== sub) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      return reply.send(character)
    },
  )

  fastify.patch(
    '/characters/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const [character] = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

      const { role, sub } = request.user
      if (role === 'player' && character.userId !== sub) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const result = UpdateCharacterInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      if (result.data.data !== undefined) {
        const [schema] = await db
          .select()
          .from(characterSchemas)
          .where(eq(characterSchemas.id, character.schemaId))
          .limit(1)

        if (schema) {
          const validationErrors = validateCharacterData(schema.fields, result.data.data)
          if (validationErrors.length > 0) {
            return reply.status(400).send({ error: 'Character data is invalid', errors: validationErrors })
          }
        }
      }

      const [updated] = await db
        .update(characters)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(characters.id, id))
        .returning()

      return reply.send(updated)
    },
  )

  fastify.post(
    '/characters/:id/xp/award',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { role, sub } = request.user
      if (role !== 'owner' && role !== 'gm') {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [character] = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

      const result = AwardXPInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [transaction] = await db.insert(xpTransactions).values({
        characterId: id,
        awardedBy: sub,
        amount: result.data.amount,
        reason: result.data.reason,
        type: 'award',
      }).returning()

      await db.update(characters).set({ totalXp: character.totalXp + result.data.amount }).where(eq(characters.id, id))

      return reply.status(201).send(transaction)
    },
  )

  fastify.post(
    '/characters/:id/xp/spend',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { role, sub } = request.user

      const { id } = request.params as { id: string }
      const [character] = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

      if (role === 'player' && character.userId !== sub) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const result = SpendXPInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      if (character.totalXp < result.data.amount) {
        return reply.status(400).send({ error: 'Insufficient XP balance' })
      }

      const [transaction] = await db.insert(xpTransactions).values({
        characterId: id,
        awardedBy: null,
        amount: result.data.amount,
        reason: result.data.reason,
        type: 'spend',
      }).returning()

      await db.update(characters).set({ totalXp: character.totalXp - result.data.amount }).where(eq(characters.id, id))

      return reply.status(201).send(transaction)
    },
  )

  fastify.get(
    '/characters/:id/xp',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { role, sub } = request.user
      const { id } = request.params as { id: string }

      const [character] = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

      if (role === 'player' && character.userId !== sub) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const transactions = await db
        .select()
        .from(xpTransactions)
        .where(eq(xpTransactions.characterId, id))
        .orderBy(desc(xpTransactions.createdAt))

      return reply.send({ balance: character.totalXp, transactions })
    },
  )
}
