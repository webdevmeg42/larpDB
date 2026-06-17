import type { FastifyPluginAsync } from 'fastify'
import { eq, desc, and, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { characters, characterSchemas, xpTransactions } from '../db/schema.js'
import { CreateCharacterInput, UpdateCharacterInput, AwardXPInput, SpendXPInput } from '@larpdb/shared'
import { validateCharacterData } from '../lib/validateCharacterData.js'
import { gmOrOwner, buildPatch } from '../lib/roles.js'

export const characterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/characters',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, userId, gameStatus } = request.gameContext

      if (gameStatus !== 'active') {
        return reply.status(403).send({ error: 'LARP is not currently active' })
      }

      const result = CreateCharacterInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [activeSchema] = await db
        .select()
        .from(characterSchemas)
        .where(and(eq(characterSchemas.isActive, true), eq(characterSchemas.gameId, gameId)))
        .limit(1)

      if (!activeSchema) {
        return reply.status(404).send({ error: 'No active character schema configured' })
      }

      const validationErrors = validateCharacterData(activeSchema.fields, result.data.data)
      if (validationErrors.length > 0) {
        return reply.status(400).send({ error: 'Character data is invalid', errors: validationErrors })
      }

      const [character] = await db.insert(characters).values({
        gameId,
        userId,
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
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      const rows = role === 'player'
        ? await db.select().from(characters).where(and(eq(characters.gameId, gameId), eq(characters.userId, userId)))
        : await db.select().from(characters).where(eq(characters.gameId, gameId))
      return reply.send(rows)
    },
  )

  fastify.get(
    '/characters/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      const { id } = request.params as { id: string }
      const [character] = await db.select().from(characters).where(and(eq(characters.id, id), eq(characters.gameId, gameId))).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })
      if (role === 'player' && character.userId !== userId) return reply.status(403).send({ error: 'Forbidden' })
      return reply.send(character)
    },
  )

  fastify.patch(
    '/characters/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId, gameStatus } = request.gameContext
      const { id } = request.params as { id: string }
      const [character] = await db.select().from(characters).where(and(eq(characters.id, id), eq(characters.gameId, gameId))).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })
      if (role === 'player' && character.userId !== userId) return reply.status(403).send({ error: 'Forbidden' })
      if (role === 'player' && gameStatus !== 'active') {
        return reply.status(403).send({ error: 'Character editing is disabled while this LARP is inactive' })
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
        .set({ ...buildPatch(result.data), updatedAt: new Date() })
        .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
        .returning()

      return reply.send(updated)
    },
  )

  fastify.post(
    '/characters/:id/xp/award',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      if (!gmOrOwner(role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const { id } = request.params as { id: string }
      const [character] = await db.select().from(characters).where(and(eq(characters.id, id), eq(characters.gameId, gameId))).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

      const result = AwardXPInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [transaction] = await db.transaction(async (tx) => {
        const [t] = await tx.insert(xpTransactions).values({
          characterId: id,
          awardedBy: userId,
          amount: result.data.amount,
          reason: result.data.reason,
          type: 'award',
        }).returning()
        await tx.update(characters)
          .set({ totalXp: sql`${characters.totalXp} + ${result.data.amount}` })
          .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
        return [t]
      })

      return reply.status(201).send(transaction)
    },
  )

  fastify.post(
    '/characters/:id/xp/spend',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext

      const { id } = request.params as { id: string }
      const [character] = await db.select({ userId: characters.userId }).from(characters).where(and(eq(characters.id, id), eq(characters.gameId, gameId))).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })
      if (role === 'player' && character.userId !== userId) return reply.status(403).send({ error: 'Forbidden' })

      const result = SpendXPInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      let transaction: typeof xpTransactions.$inferSelect | undefined
      try {
        ;[transaction] = await db.transaction(async (tx) => {
          // Lock the character row to prevent concurrent XP spend race
          const [locked] = await tx
            .select({ totalXp: characters.totalXp })
            .from(characters)
            .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
            .for('update')
            .limit(1)

          if (!locked || locked.totalXp < result.data.amount) {
            throw Object.assign(new Error('Insufficient XP balance'), { statusCode: 400 })
          }

          const [t] = await tx.insert(xpTransactions).values({
            characterId: id,
            awardedBy: null,
            amount: result.data.amount,
            reason: result.data.reason,
            type: 'spend',
          }).returning()
          await tx.update(characters)
            .set({ totalXp: sql`${characters.totalXp} - ${result.data.amount}` })
            .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
          return [t]
        })
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 400) {
          return reply.status(400).send({ error: 'Insufficient XP balance' })
        }
        throw err
      }

      return reply.status(201).send(transaction)
    },
  )

  fastify.get(
    '/characters/:id/xp',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      const { id } = request.params as { id: string }

      const [character] = await db.select().from(characters).where(and(eq(characters.id, id), eq(characters.gameId, gameId))).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })
      if (role === 'player' && character.userId !== userId) return reply.status(403).send({ error: 'Forbidden' })

      const transactions = await db
        .select()
        .from(xpTransactions)
        .where(eq(xpTransactions.characterId, id))
        .orderBy(desc(xpTransactions.createdAt))

      return reply.send({ balance: character.totalXp, transactions })
    },
  )
}
