import type { FastifyPluginAsync } from 'fastify'
import { eq, desc, and, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { characters, characterSchemas, siteConfig, xpTransactions, eventRegistrations, purchases } from '../db/schema.js'
import { CreateCharacterInput, UpdateCharacterInput, AwardXPInput, SpendXPInput, GmDataInput, computeCumulativeXp } from '@larpdb/shared'
import { validateCharacterData } from '../lib/validateCharacterData.js'
import { gmOrOwner, buildPatch } from '../lib/roles.js'
import { applyLevelProgression } from '../lib/applyLevelProgression.js'
import { resolveLevelFromXp } from '../lib/resolveLevelFromXp.js'

export const characterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/characters',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, userId, gameStatus, role } = request.gameContext

      if (gameStatus !== 'active') {
        return reply.status(403).send({ error: 'LARP is not currently active' })
      }

      const result = CreateCharacterInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const { raceSchemaId, classSchemaId } = result.data

      const schemasToLoad = [
        raceSchemaId
          ? db.select().from(characterSchemas).where(and(eq(characterSchemas.id, raceSchemaId), eq(characterSchemas.gameId, gameId), eq(characterSchemas.isActive, true))).limit(1)
          : Promise.resolve([] as (typeof characterSchemas.$inferSelect)[]),
        classSchemaId
          ? db.select().from(characterSchemas).where(and(eq(characterSchemas.id, classSchemaId), eq(characterSchemas.gameId, gameId), eq(characterSchemas.isActive, true))).limit(1)
          : Promise.resolve([] as (typeof characterSchemas.$inferSelect)[]),
      ] as const

      const [[raceRow], [classRow]] = await Promise.all(schemasToLoad)

      if (!raceRow && !classRow) {
        return reply.status(400).send({ error: 'At least one valid active schema is required' })
      }
      if (raceSchemaId && !raceRow) {
        return reply.status(400).send({ error: 'Race schema not found or not active' })
      }
      if (classSchemaId && !classRow) {
        return reply.status(400).send({ error: 'Class schema not found or not active' })
      }

      const combinedFields = [
        ...(raceRow?.fields ?? []),
        ...(classRow?.fields ?? []),
      ]

      // Mirror the frontend: skip required-field validation for statblock, XP-gated,
      // and GM-only fields (level) — these are not shown during creation.
      const creationFields = combinedFields.filter(f => {
        if (f.type === 'statblock') return false
        if (f.type === 'hitpoints' || f.type === 'attacks' || f.type === 'spells') return false
        if (f.gmOnly) return false
        if (f.xpCostPerPoint !== undefined) return false
        if (f.xpCost !== undefined) return false
        if (f.options?.some((o: { xpCost?: number }) => o.xpCost !== undefined)) return false
        if (f.stats?.some((s: { xpCostPerPoint?: number }) => s.xpCostPerPoint !== undefined)) return false
        if (f.type === 'number' && f.label.toLowerCase() === 'level') return false
        return true
      })
      const validationErrors = validateCharacterData(creationFields, result.data.data)
      if (validationErrors.length > 0) {
        return reply.status(400).send({ error: 'Character data is invalid', errors: validationErrors })
      }

      // Apply LARP base level, then stamp all progression values for that level
      const [config] = await db.select({ codex: siteConfig.codex })
        .from(siteConfig)
        .where(eq(siteConfig.gameId, gameId))
        .limit(1)

      const baseLevel = config?.codex?.baseLevel
      let characterData = { ...result.data.data }

      if (baseLevel !== undefined) {
        const levelField = combinedFields.find(
          f => f.type === 'number' && f.label.toLowerCase() === 'level',
        )
        if (levelField && characterData[levelField.id] === undefined) {
          characterData[levelField.id] = baseLevel
        }
      }

      // Apply level-based progression from the class schema at the character's starting level
      if (classRow?.fields && baseLevel !== undefined) {
        characterData = applyLevelProgression(baseLevel, classRow.fields, characterData)
      }

      const primarySchemaId = (raceRow ?? classRow)!.id

      const initialXp = (baseLevel !== undefined && config?.codex)
        ? (computeCumulativeXp(baseLevel, config.codex) ?? 0)
        : 0

      const character = await db.transaction(async (tx) => {
        const [c] = await tx.insert(characters).values({
          gameId,
          userId,
          schemaId: primarySchemaId,
          classSchemaId: classRow?.id ?? null,
          name: result.data.name,
          portraitUrl: result.data.portraitUrl ?? null,
          data: characterData,
        }).returning()
        if (!c) throw new Error('Failed to create character')

        if (initialXp > 0) {
          await tx.insert(xpTransactions).values({
            characterId: c.id,
            awardedBy: userId,
            amount: initialXp,
            reason: `Starting XP (Level ${baseLevel})`,
            type: 'award',
          })
          await tx.update(characters)
            .set({ totalXp: initialXp })
            .where(eq(characters.id, c.id))
          return { ...c, totalXp: initialXp }
        }
        return c
      })

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

      let finalData = result.data.data

      if (finalData !== undefined) {
        const [raceSchema, classSchemaRow] = await Promise.all([
          db.select().from(characterSchemas).where(eq(characterSchemas.id, character.schemaId)).limit(1),
          character.classSchemaId
            ? db.select().from(characterSchemas).where(eq(characterSchemas.id, character.classSchemaId)).limit(1)
            : Promise.resolve([] as (typeof characterSchemas.$inferSelect)[]),
        ])

        if (raceSchema[0]) {
          const validationErrors = validateCharacterData(raceSchema[0].fields, finalData)
          if (validationErrors.length > 0) {
            return reply.status(400).send({ error: 'Character data is invalid', errors: validationErrors })
          }
        }

        // Detect level change and re-apply class progression
        if (classSchemaRow[0]?.fields) {
          const allFields = [
            ...(raceSchema[0]?.fields ?? []),
            ...classSchemaRow[0].fields,
          ]
          const levelField = allFields.find(
            f => f.type === 'number' && f.label.toLowerCase() === 'level',
          )
          if (levelField) {
            const newLevel = finalData[levelField.id]
            const oldLevel = (character.data as Record<string, unknown>)?.[levelField.id]
            if (typeof newLevel === 'number' && newLevel !== oldLevel) {
              finalData = applyLevelProgression(newLevel, classSchemaRow[0].fields, finalData)

              // Auto-award XP for level-up
              const [siteCfg] = await db.select({ codex: siteConfig.codex })
                .from(siteConfig)
                .where(eq(siteConfig.gameId, gameId))
                .limit(1)

              if (siteCfg?.codex) {
                const prevXp = computeCumulativeXp(typeof oldLevel === 'number' ? oldLevel : 0, siteCfg.codex) ?? 0
                const nextXp = computeCumulativeXp(newLevel, siteCfg.codex) ?? 0
                const delta = nextXp - prevXp
                if (delta > 0) {
                  await db.transaction(async (tx) => {
                    await tx.insert(xpTransactions).values({
                      characterId: id,
                      awardedBy: userId,
                      amount: delta,
                      reason: `Level ${String(oldLevel ?? 0)} → ${newLevel}`,
                      type: 'award',
                    })
                    await tx.update(characters)
                      .set({ totalXp: sql`${characters.totalXp} + ${delta}` })
                      .where(eq(characters.id, id))
                  })
                }
              }
            }
          }
        }
      }

      const { xpSpend: xpSpendAmount, ...patchInputData } = result.data
      const xpSpend = xpSpendAmount ?? 0
      const patchPayload = buildPatch({ ...patchInputData, ...(finalData !== undefined ? { data: finalData } : {}) })

      let updated: typeof characters.$inferSelect | undefined
      try {
        ;[updated] = await db.transaction(async (tx) => {
          if (xpSpend > 0) {
            const [locked] = await tx
              .select({ totalXp: characters.totalXp })
              .from(characters)
              .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
              .for('update')
              .limit(1)

            if (!locked || locked.totalXp < xpSpend) {
              throw Object.assign(new Error('Insufficient XP'), { statusCode: 400 })
            }

            await tx.insert(xpTransactions).values({
              characterId: id,
              awardedBy: null,
              amount: xpSpend,
              reason: 'Character update',
              type: 'spend',
            })
          }

          const [c] = await tx
            .update(characters)
            .set({
              ...patchPayload,
              ...(xpSpend > 0 ? { totalXp: sql`${characters.totalXp} - ${xpSpend}` } : {}),
              updatedAt: new Date(),
            })
            .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
            .returning()

          return [c]
        })
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 400) {
          return reply.status(400).send({ error: 'Insufficient XP balance' })
        }
        throw err
      }

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
      try {
        const [siteCfg] = await db
          .select({ codex: siteConfig.codex })
          .from(siteConfig)
          .where(eq(siteConfig.gameId, gameId))
          .limit(1)

        if (siteCfg?.codex) {
          const targetLevel = resolveLevelFromXp(newTotalXp, siteCfg.codex)
          if (targetLevel !== null) {
            const [raceSchema, classSchemaRow] = await Promise.all([
              db.select().from(characterSchemas).where(eq(characterSchemas.id, character.schemaId)).limit(1),
              character.classSchemaId
                ? db.select().from(characterSchemas).where(eq(characterSchemas.id, character.classSchemaId)).limit(1)
                : Promise.resolve([] as (typeof characterSchemas.$inferSelect)[]),
            ])
            const allFields = [...(raceSchema[0]?.fields ?? []), ...(classSchemaRow[0]?.fields ?? [])]
            const levelField = allFields.find(f => f.type === 'number' && f.label.toLowerCase() === 'level')

            if (levelField) {
              const currentLevel = (character.data as Record<string, unknown>)[levelField.id] as number | undefined
              if (currentLevel !== targetLevel) {
                const newData = { ...(character.data as Record<string, unknown>), [levelField.id]: targetLevel }
                const progressedData = applyLevelProgression(targetLevel, classSchemaRow[0]?.fields ?? [], newData)
                await db.update(characters)
                  .set({ data: progressedData, updatedAt: new Date() })
                  .where(eq(characters.id, id))
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

  fastify.post(
    '/characters/:id/xp/sync-to-level',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      if (!gmOrOwner(role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const { id } = request.params as { id: string }
      const [character] = await db
        .select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
        .limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

      const [siteCfg] = await db
        .select({ codex: siteConfig.codex })
        .from(siteConfig)
        .where(eq(siteConfig.gameId, gameId))
        .limit(1)
      if (!siteCfg?.codex) return reply.status(400).send({ error: 'No leveling system configured' })

      const [raceSchema, classSchemaRow] = await Promise.all([
        db.select().from(characterSchemas).where(eq(characterSchemas.id, character.schemaId)).limit(1),
        character.classSchemaId
          ? db.select().from(characterSchemas).where(eq(characterSchemas.id, character.classSchemaId)).limit(1)
          : Promise.resolve([] as (typeof characterSchemas.$inferSelect)[]),
      ])
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
      if (!gmOrOwner(role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const { id } = request.params as { id: string }
      const [character] = await db
        .select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
        .limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

      const [spentRow] = await db
        .select({ totalSpent: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)::int` })
        .from(xpTransactions)
        .where(and(eq(xpTransactions.characterId, id), eq(xpTransactions.type, 'spend')))

      const totalSpent = spentRow?.totalSpent ?? 0

      const [raceSchema, classSchemaRow] = await Promise.all([
        db.select().from(characterSchemas).where(eq(characterSchemas.id, character.schemaId)).limit(1),
        character.classSchemaId
          ? db.select().from(characterSchemas).where(eq(characterSchemas.id, character.classSchemaId)).limit(1)
          : Promise.resolve([] as (typeof characterSchemas.$inferSelect)[]),
      ])
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

  fastify.patch(
    '/characters/:id/gm-data',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (!gmOrOwner(role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(characters).where(and(eq(characters.id, id), eq(characters.gameId, gameId))).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Character not found' })

      const result = GmDataInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })

      const [updated] = await db
        .update(characters)
        .set({ gmData: result.data, updatedAt: new Date() })
        .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
        .returning()

      return reply.send(updated)
    },
  )

  fastify.delete(
    '/characters/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      const { id } = request.params as { id: string }

      const [character] = await db
        .select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.gameId, gameId)))
        .limit(1)

      if (!character) return reply.status(404).send({ error: 'Character not found' })
      if (role === 'player' && character.userId !== userId) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      await db.transaction(async (tx) => {
        await tx.update(eventRegistrations)
          .set({ characterId: null })
          .where(eq(eventRegistrations.characterId, id))
        await tx.delete(purchases).where(eq(purchases.characterId, id))
        await tx.delete(xpTransactions).where(eq(xpTransactions.characterId, id))
        await tx.delete(characters).where(eq(characters.id, id))
      })
      return reply.status(204).send()
    },
  )
}
