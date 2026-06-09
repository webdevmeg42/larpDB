import type { FastifyPluginAsync } from 'fastify'
import { eq, and, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import { storeItems, purchases, siteConfig, eventRegistrations, characters, users, events } from '../db/schema.js'
import { CreateStoreItemInput, UpdateStoreItemInput, CreatePurchaseInput } from '@larpdb/shared'

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
          price: storeItems.price,
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
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const result = CreateStoreItemInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [event] = await db.select().from(events).where(and(eq(events.id, result.data.eventId), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Event not found' })

      const [item] = await db.insert(storeItems).values({
        eventId: result.data.eventId,
        name: result.data.name,
        description: result.data.description ?? null,
        price: result.data.price,
        quantityAvailable: result.data.quantityAvailable ?? null,
        isAvailable: result.data.isAvailable ?? true,
      }).returning()

      return reply.status(201).send(item)
    },
  )

  fastify.patch(
    '/store/items/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(storeItems).where(eq(storeItems.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Store item not found' })

      const [event] = await db.select().from(events).where(and(eq(events.id, existing.eventId), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Store item not found' })

      const result = UpdateStoreItemInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const patch = Object.fromEntries(
        Object.entries(result.data).filter(([, v]) => v !== undefined),
      ) as Parameters<ReturnType<typeof db.update<typeof storeItems>>['set']>[0]

      const [updated] = await db.update(storeItems).set(patch).where(and(eq(storeItems.id, id), eq(storeItems.eventId, existing.eventId))).returning()
      return reply.send(updated)
    },
  )

  fastify.delete(
    '/store/items/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(storeItems).where(eq(storeItems.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Store item not found' })

      const [event] = await db.select().from(events).where(and(eq(events.id, existing.eventId), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Store item not found' })

      const [hasPurchase] = await db.select().from(purchases).where(eq(purchases.storeItemId, id)).limit(1)
      if (hasPurchase) {
        return reply.status(409).send({ error: 'Cannot delete item with existing purchases' })
      }

      await db.delete(storeItems).where(and(eq(storeItems.id, id), eq(storeItems.eventId, existing.eventId)))
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

      const { eventId, userId, characterId } = request.query as {
        eventId?: string
        userId?: string
        characterId?: string
      }

      const conditions: SQL[] = [eq(events.gameId, gameId)]
      if (eventId) conditions.push(eq(purchases.eventId, eventId))
      if (userId) conditions.push(eq(purchases.userId, userId))
      if (characterId) conditions.push(eq(purchases.characterId, characterId))

      const rows = await db
        .select({
          id: purchases.id,
          storeItemId: purchases.storeItemId,
          eventId: purchases.eventId,
          userId: purchases.userId,
          characterId: purchases.characterId,
          quantity: purchases.quantity,
          unitPrice: purchases.unitPrice,
          currencyName: purchases.currencyName,
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

      return reply.send(rows)
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

      const [item] = await db.select().from(storeItems).where(eq(storeItems.id, storeItemId)).limit(1)
      if (!item) return reply.status(404).send({ error: 'Store item not found' })
      if (!item.isAvailable) return reply.status(409).send({ error: 'Store item is not available' })

      const [character] = await db.select().from(characters).where(and(eq(characters.id, characterId), eq(characters.gameId, gameId))).limit(1)
      if (!character) return reply.status(404).send({ error: 'Character not found' })

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

      let purchase: typeof purchases.$inferSelect | undefined
      try {
        ;[purchase] = await db.transaction(async (tx) => {
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

          const [config] = await tx.select({ currencyName: siteConfig.currencyName }).from(siteConfig).where(eq(siteConfig.gameId, gameId)).limit(1)
          const currencyName = config?.currencyName ?? 'monies'

          return tx.insert(purchases).values({
            storeItemId,
            eventId: item.eventId,
            userId: character.userId,
            characterId,
            quantity,
            unitPrice: item.price,
            currencyName,
          }).returning()
        })
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 409) {
          return reply.status(409).send({ error: 'Insufficient quantity available' })
        }
        throw err
      }

      return reply.status(201).send(purchase)
    },
  )
}
