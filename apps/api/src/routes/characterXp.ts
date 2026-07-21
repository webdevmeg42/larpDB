import type { FastifyPluginAsync } from 'fastify'
import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { characters, siteConfig, xpTransactions } from '../db/schema.js'
import { AwardXPInput, SpendXPInput, computeCumulativeXp, resolveLevelFromXp } from '@plotrunner/shared'
import { loadCharacterSchemas } from '../lib/character.js'
import { gmOrOwner } from '../lib/roles.js'
import { applyLevelProgression } from '../lib/applyLevelProgression.js'

export const characterXpRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/characters/:id/xp/award',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      if (!gmOrOwner(role)) {
        request.log.warn({ userId, role, gameId }, "non-staff tried to perform GM action on character")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [character] = await db.select().from(characters).where(and(eq(characters.id, id), eq(characters.gameId, gameId))).limit(1)
      if (!character) {
        request.log.warn({ id, gameId }, "character not found")
        return reply.status(404).send({ error: 'Character not found' })
      }

      const result = AwardXPInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const newTotalXp = character.totalXp + result.data.amount

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

      // Auto-level: resolve the correct level for the new XP total and update if changed
      // Fetch siteConfig and schemas in parallel — neither depends on the other
      try {
        const [[siteCfg], [raceSchema, classSchemaRow]] = await Promise.all([
          db.select({ codex: siteConfig.codex }).from(siteConfig).where(eq(siteConfig.gameId, gameId)).limit(1),
          loadCharacterSchemas(character),
        ])

        if (siteCfg?.codex) {
          const targetLevel = resolveLevelFromXp(newTotalXp, siteCfg.codex)
          if (targetLevel !== null) {
            const allFields = [...(raceSchema[0]?.fields ?? []), ...(classSchemaRow[0]?.fields ?? [])]
            const levelField = allFields.find(f => f.type === 'number' && f.label.toLowerCase() === 'level')

            if (levelField) {
              const currentLevel = (character.data as Record<string, unknown>)[levelField.id] as number | undefined
              if (currentLevel !== targetLevel) {
                const newData = { ...(character.data as Record<string, unknown>), [levelField.id]: targetLevel }
                const progressedData = applyLevelProgression(targetLevel, classSchemaRow[0]?.fields ?? [], newData)
                await db.update(characters)
                  .set({ data: progressedData, updatedAt: new Date() })
                  .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
              }
            }
          }
        }
      } catch {
        // Auto-level failure is non-fatal — XP was already awarded correctly
      }

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
      if (!character) {
        request.log.warn({ id, gameId }, "character not found")
        return reply.status(404).send({ error: 'Character not found' })
      }
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
      if (!character) {
        request.log.warn({ id, gameId }, "character not found")
        return reply.status(404).send({ error: 'Character not found' })
      }
      if (role === 'player' && character.userId !== userId) return reply.status(403).send({ error: 'Forbidden' })

      const transactions = await db
        .select()
        .from(xpTransactions)
        .where(eq(xpTransactions.characterId, id))
        .orderBy(desc(xpTransactions.createdAt))

      return reply.send({ balance: character.totalXp, transactions })
    },
  )

  fastify.post(
    '/characters/:id/xp/sync-to-level',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      if (!gmOrOwner(role)) {
        request.log.warn({ userId, role, gameId }, "non-staff tried to perform GM action on character")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [character] = await db
        .select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
        .limit(1)
      if (!character) {
        request.log.warn({ id, gameId }, "character not found")
        return reply.status(404).send({ error: 'Character not found' })
      }

      const [[siteCfg], [raceSchema, classSchemaRow]] = await Promise.all([
        db.select({ codex: siteConfig.codex }).from(siteConfig).where(eq(siteConfig.gameId, gameId)).limit(1),
        loadCharacterSchemas(character),
      ])
      if (!siteCfg?.codex) return reply.status(400).send({ error: 'No leveling system configured' })
      const allFields = [...(raceSchema[0]?.fields ?? []), ...(classSchemaRow[0]?.fields ?? [])]
      const levelField = allFields.find(f => f.type === 'number' && f.label.toLowerCase() === 'level')
      const currentLevel = levelField
        ? (character.data as Record<string, unknown>)[levelField.id] as number | undefined
        : undefined

      if (currentLevel === undefined) return reply.status(400).send({ error: 'Character has no level field' })

      const expectedXp = computeCumulativeXp(currentLevel, siteCfg.codex)
      if (expectedXp === null) return reply.status(400).send({ error: 'Cannot compute XP for this leveling system' })

      const delta = expectedXp - character.totalXp
      if (delta <= 0) return reply.send({ balance: character.totalXp, awarded: 0 })

      await db.transaction(async (tx) => {
        await tx.insert(xpTransactions).values({
          characterId: id,
          awardedBy: userId,
          amount: delta,
          reason: `XP sync to Level ${currentLevel}`,
          type: 'award',
        })
        await tx.update(characters)
          .set({ totalXp: sql`${characters.totalXp} + ${delta}` })
          .where(eq(characters.id, id))
      })

      return reply.send({ balance: expectedXp, awarded: delta })
    },
  )

  fastify.post(
    '/characters/:id/xp/reset',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (!gmOrOwner(role)) {
        request.log.warn({ userId: request.gameContext.userId, role, gameId }, "non-staff tried to perform GM action on character")
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [character] = await db
        .select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
        .limit(1)
      if (!character) {
        request.log.warn({ id, gameId }, "character not found")
        return reply.status(404).send({ error: 'Character not found' })
      }

      // Fetch spent XP total and schemas in parallel — neither depends on the other
      const [[spentRow], [raceSchema, classSchemaRow]] = await Promise.all([
        db
          .select({ totalSpent: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)::int` })
          .from(xpTransactions)
          .where(and(eq(xpTransactions.characterId, id), eq(xpTransactions.type, 'spend'))),
        loadCharacterSchemas(character),
      ])

      const totalSpent = spentRow?.totalSpent ?? 0
      const allFields = [...(raceSchema[0]?.fields ?? []), ...(classSchemaRow[0]?.fields ?? [])]
      const levelField = allFields.find(f => f.type === 'number' && f.label.toLowerCase() === 'level')
      const currentLevel = levelField
        ? (character.data as Record<string, unknown>)[levelField.id] as number | undefined
        : undefined

      let resetData: Record<string, unknown> = character.classSchemaId && currentLevel !== undefined && classSchemaRow[0]?.fields
        ? applyLevelProgression(currentLevel, classSchemaRow[0].fields, character.data as Record<string, unknown>)
        : { ...(character.data as Record<string, unknown>) }

      // Clear all XP-purchasable fields back to their empty/"—" state
      for (const field of allFields) {
        if (field.locked) continue
        switch (field.type) {
          case 'number':
            if (field.xpCostPerPoint !== undefined) delete resetData[field.id]
            break
          case 'toggle':
            if (field.xpCost !== undefined) resetData[field.id] = false
            break
          case 'select':
            if (field.options?.some(o => o.xpCost !== undefined)) delete resetData[field.id]
            break
          case 'multiselect':
            if (field.options?.some(o => o.xpCost !== undefined)) resetData[field.id] = []
            break
          case 'statblock': {
            if (!field.stats) break
            const block = { ...(typeof resetData[field.id] === 'object' && resetData[field.id] !== null ? resetData[field.id] as Record<string, unknown> : {}) }
            for (const stat of field.stats) {
              // Clear any stat that isn't determined by level progression.
              // Stats with levelEntries get their value from applyLevelProgression above,
              // so leave those alone. Everything else is user-set and should be cleared.
              if (!((stat.levelEntries ?? []).length > 0)) {
                delete block[stat.key]
              }
            }
            resetData[field.id] = block
            break
          }
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(xpTransactions)
          .where(and(eq(xpTransactions.characterId, id), eq(xpTransactions.type, 'spend')))
        await tx.update(characters)
          .set({ totalXp: sql`${characters.totalXp} + ${totalSpent}`, data: resetData, updatedAt: new Date() })
          .where(eq(characters.id, id))
      })

      const [updatedChar] = await db.select().from(characters).where(eq(characters.id, id)).limit(1)
      return reply.status(200).send({ character: updatedChar, refunded: totalSpent })
    },
  )
}
