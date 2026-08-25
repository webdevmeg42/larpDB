import type { FastifyPluginAsync } from 'fastify'
import { eq, and, or, sql, inArray } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import { storeItems, purchases, eventRegistrations, characters, users, events } from '../db/schema.js'
import { CreateStoreItemInput, UpdateStoreItemInput, CreatePurchaseInput } from '@plotrunner/shared'
import { buildPatch } from '../lib/roles.js'
import { parsePagination } from '../lib/pagination.js'

export const storeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/store/items',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId } = request.gameContext
      const { eventId } = request.query as { eventId?: string }
      const baseConditions: SQL[] = [eq(events.gameId, gameId)]
      if (eventId) baseConditions.push(eq(storeItems.eventId, eventId))
      const rows = await db
        .select({
          id: storeItems.id,
          eventId: storeItems.eventId,
          name: storeItems.name,
          description: storeItems.description,
          priceUsd: storeItems.priceUsd,
          quantityAvailable: storeItems.quantityAvailable,
          isAvailable: storeItems.isAvailable,
          createdAt: storeItems.createdAt,
        })
        .from(storeItems)
        .innerJoin(events, eq(storeItems.eventId, events.id))
        .where(and(...baseConditions))
      return reply.send(rows)
    },
  )

  fastify.post(
    '/store/items',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ userId: request.gameContext.userId, role }, "non-owner tried to create store item")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const result = CreateStoreItemInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      if (result.data.eventId) {
        const [event] = await db.select().from(events).where(and(eq(events.id, result.data.eventId), eq(events.gameId, gameId))).limit(1)
        if (!event) {
          request.log.warn({ eventId: result.data.eventId, gameId }, "event not found")
          return reply.status(404).send({ error: 'Event not found' })
        }
      }

      const [item] = await db.insert(storeItems).values({
        gameId,
        eventId: result.data.eventId ?? null,
        itemType: result.data.itemType,
        name: result.data.name,
        description: result.data.description ?? null,
        priceUsd: result.data.priceUsd,
        xpAmount: result.data.xpAmount ?? null,
        quantityAvailable: result.data.quantityAvailable ?? null,
        isAvailable: result.data.isAvailable ?? true,
      }).returning()

      request.log.info({ id: item!.id, name: item!.name, priceUsd: item!.priceUsd, gameId }, "store item created")
      return reply.status(201).send(item)
    },
  )

  fastify.patch(
    '/store/items/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ userId, role, gameId }, "non-owner tried to update store item")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db
        .select({ id: storeItems.id, eventId: storeItems.eventId })
        .from(storeItems)
        .innerJoin(events, and(eq(events.id, storeItems.eventId), eq(events.gameId, gameId)))
        .where(eq(storeItems.id, id))
        .limit(1)
      if (!existing) {
        request.log.warn({ id, gameId }, "store item not found")
        return reply.status(404).send({ error: 'Store item not found' })
      }

      const result = UpdateStoreItemInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [updated] = await db.update(storeItems)
        .set(buildPatch(result.data) as Parameters<ReturnType<typeof db.update<typeof storeItems>>['set']>[0])
        .where(and(
          eq(storeItems.id, id),
          inArray(storeItems.eventId, db.select({ id: events.id }).from(events).where(eq(events.gameId, gameId))),
        ))
        .returning()
      request.log.info({ id, gameId }, "store item updated")
      return reply.send(updated)
    },
  )

  fastify.delete(
    '/store/items/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role, userId } = request.gameContext
      if (role !== 'owner') {
        request.log.warn({ userId, role, gameId }, "non-owner tried to delete store item")
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db
        .select({ id: storeItems.id })
        .from(storeItems)
        .innerJoin(events, and(eq(events.id, storeItems.eventId), eq(events.gameId, gameId)))
        .where(eq(storeItems.id, id))
        .limit(1)
      if (!existing) {
        request.log.warn({ id, gameId }, "store item not found")
        return reply.status(404).send({ error: 'Store item not found' })
      }

      try {
        await db.transaction(async (tx) => {
          const [hasPurchase] = await tx
            .select({ id: purchases.id })
            .from(purchases)
            .where(eq(purchases.storeItemId, id))
            .limit(1)
          if (hasPurchase) {
            throw Object.assign(new Error('Cannot delete item with existing purchases'), { statusCode: 409 })
          }
          await tx.delete(storeItems).where(eq(storeItems.id, id))
        })
      } catch (err: unknown) {
        const code = (err as { statusCode?: number; code?: string })
        if (code.statusCode === 409) {
          request.log.warn({ id, gameId }, "store item delete rejected — item has existing purchases")
          return reply.status(409).send({ error: 'Cannot delete item with existing purchases' })
        }
        if (code.code === '23503') {
          request.log.warn({ id, gameId }, "store item delete rejected — item has existing purchases")
          return reply.status(409).send({ error: 'Cannot delete item with existing purchases' })
        }
        throw err
      }
      request.log.info({ id, gameId }, "store item deleted")
      return reply.status(204).send()
    },
  )

  fastify.get(
    '/store/purchases',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { eventId, userId, characterId, limit: limitParam, offset: offsetParam } = request.query as {
        eventId?: string
        userId?: string
        characterId?: string
        limit?: string
        offset?: string
      }

      const { limit: resolvedLimit, offset: resolvedOffset } = parsePagination(
        { limit: limitParam, offset: offsetParam },
        { limit: 100, maxLimit: 500 },
      )

      const conditions: SQL[] = [eq(events.gameId, gameId)]
      if (eventId) conditions.push(eq(purchases.eventId, eventId))
      if (userId) conditions.push(eq(purchases.userId, userId))
      if (characterId) conditions.push(eq(purchases.characterId, characterId))

      const [countResult] = await db
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(purchases)
        .leftJoin(users, eq(purchases.userId, users.id))
        .leftJoin(characters, eq(purchases.characterId, characters.id))
        .innerJoin(events, eq(purchases.eventId, events.id))
        .leftJoin(storeItems, eq(purchases.storeItemId, storeItems.id))
        .where(and(...conditions))

      const items = await db
        .select({
          id: purchases.id,
          storeItemId: purchases.storeItemId,
          eventId: purchases.eventId,
          userId: purchases.userId,
          characterId: purchases.characterId,
          quantity: purchases.quantity,
          unitPriceUsd: purchases.unitPriceUsd,
          purchasedAt: purchases.purchasedAt,
          playerName: users.displayName,
          characterName: characters.name,
          eventTitle: events.title,
          itemName: storeItems.name,
        })
        .from(purchases)
        .leftJoin(users, eq(purchases.userId, users.id))
        .leftJoin(characters, eq(purchases.characterId, characters.id))
        .innerJoin(events, eq(purchases.eventId, events.id))
        .leftJoin(storeItems, eq(purchases.storeItemId, storeItems.id))
        .where(and(...conditions))
        .limit(resolvedLimit)
        .offset(resolvedOffset)

      return reply.send({ total: countResult?.total ?? 0, items })
    },
  )

  fastify.post(
    '/store/purchases',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const result = CreatePurchaseInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const { storeItemId, characterId, quantity = 1 } = result.data

      const [item] = await db
        .select({
          id: storeItems.id,
          gameId: storeItems.gameId,
          eventId: storeItems.eventId,
          isAvailable: storeItems.isAvailable,
          quantityAvailable: storeItems.quantityAvailable,
          priceUsd: storeItems.priceUsd,
        })
        .from(storeItems)
        .where(and(eq(storeItems.id, storeItemId), eq(storeItems.gameId, gameId)))
        .limit(1)
      if (!item) {
        request.log.warn({ storeItemId, gameId }, "store item not found")
        return reply.status(404).send({ error: 'Store item not found' })
      }
      if (!item.isAvailable) {
        request.log.warn({ storeItemId, gameId }, "purchase rejected — store item is not available")
        return reply.status(409).send({ error: 'Store item is not available' })
      }

      const [character] = await db.select().from(characters).where(and(eq(characters.id, characterId), eq(characters.gameId, gameId))).limit(1)
      if (!character) {
        request.log.warn({ characterId, gameId }, "character not found")
        return reply.status(404).send({ error: 'Character not found' })
      }

      if (item.eventId) {
        const [registration] = await db
          .select()
          .from(eventRegistrations)
          .where(and(
            eq(eventRegistrations.eventId, item.eventId),
            eq(eventRegistrations.characterId, characterId),
            or(
              eq(eventRegistrations.status, 'pending'),
              eq(eventRegistrations.status, 'confirmed'),
            ),
          ))
          .limit(1)

        if (!registration) {
          return reply.status(422).send({
            error: 'Character must be registered for this event before purchasing amenities.',
          })
        }
      }

      if (!item.eventId) {
        return reply.status(422).send({ error: 'This store item is not associated with an event and cannot be purchased here.' })
      }
      const itemEventId = item.eventId

      let purchase: typeof purchases.$inferSelect | undefined
      try {
        ;[purchase] = await db.transaction(async (tx) => {
          // Lock the store item row to prevent concurrent oversell
          await tx.select({ id: storeItems.id }).from(storeItems).where(eq(storeItems.id, storeItemId)).for('update').limit(1)

          if (item.quantityAvailable !== null) {
            const [soldResult] = await tx
              .select({ total: sql<number>`COALESCE(SUM(${purchases.quantity}), 0)::int` })
              .from(purchases)
              .where(eq(purchases.storeItemId, storeItemId))
            const sold = soldResult?.total ?? 0
            if (item.quantityAvailable - sold < quantity) {
              throw Object.assign(new Error('Insufficient quantity available'), { statusCode: 409 })
            }
          }

          return tx.insert(purchases).values({
            storeItemId,
            eventId: itemEventId,
            userId: character.userId,
            characterId,
            quantity,
            unitPriceUsd: item.priceUsd,
          }).returning()
        })
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 409) {
          return reply.status(409).send({ error: 'Insufficient quantity available' })
        }
        throw err
      }

      request.log.info({ purchaseId: purchase!.id, userId: request.gameContext.userId, itemId: storeItemId, gameId }, "store purchase recorded")
      return reply.status(201).send(purchase)
    },
  )
}
