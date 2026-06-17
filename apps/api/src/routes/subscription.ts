import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { game, larpSubscriptions } from '../db/schema.js'
import { SubscribeInput } from '@larpdb/shared'

export const subscriptionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/subscriptions',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = SubscribeInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }
      const userId = request.user.sub
      const { gameId } = result.data

      const [targetGame] = await db
        .select({ id: game.id })
        .from(game)
        .where(eq(game.id, gameId))
        .limit(1)
      if (!targetGame) return reply.status(404).send({ error: 'Game not found' })

      const [existing] = await db
        .select()
        .from(larpSubscriptions)
        .where(and(eq(larpSubscriptions.gameId, gameId), eq(larpSubscriptions.userId, userId)))
        .limit(1)
      if (existing) return reply.status(409).send({ error: 'Already subscribed' })

      const [sub] = await db.insert(larpSubscriptions).values({ gameId, userId }).returning()
      return reply.status(201).send(sub)
    },
  )

  fastify.delete(
    '/subscriptions/:gameId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { gameId } = request.params as { gameId: string }
      const userId = request.user.sub

      const [deleted] = await db
        .delete(larpSubscriptions)
        .where(and(eq(larpSubscriptions.gameId, gameId), eq(larpSubscriptions.userId, userId)))
        .returning()
      if (!deleted) return reply.status(404).send({ error: 'Subscription not found' })

      return reply.status(204).send()
    },
  )

  fastify.get(
    '/subscriptions',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub
      const subs = await db
        .select()
        .from(larpSubscriptions)
        .where(eq(larpSubscriptions.userId, userId))
      return reply.send(subs)
    },
  )
}
