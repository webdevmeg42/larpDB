import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { game, gameMembers, adventureSubscriptions } from '../db/schema.js'
import { SubscribeInput } from '@plotrunner/shared'

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
        .select({ id: game.id, joinMode: game.joinMode })
        .from(game)
        .where(eq(game.id, gameId))
        .limit(1)
      if (!targetGame) {
        request.log.warn({ gameId, userId }, 'subscription rejected — game not found')
        return reply.status(404).send({ error: 'Game not found' })
      }

      await db.transaction(async (tx) => {
        await tx
          .insert(adventureSubscriptions)
          .values({ gameId, userId })
          .onConflictDoNothing()

        if (targetGame.joinMode === 'open') {
          // Open-mode: subscribe = immediate active membership; activate any stale pending row
          await tx
            .insert(gameMembers)
            .values({ gameId, userId, role: 'player', status: 'active' })
            .onConflictDoUpdate({
              target: [gameMembers.gameId, gameMembers.userId],
              set: { status: 'active' },
            })
        } else {
          // Approval-mode: subscribe adds a pending membership if not already a member;
          // never promotes a pending row — that requires explicit GM/owner approval
          await tx
            .insert(gameMembers)
            .values({ gameId, userId, role: 'player', status: 'pending' })
            .onConflictDoNothing()
        }
      })

      request.log.info({ gameId, userId, joinMode: targetGame.joinMode }, 'user subscribed to adventure')
      return reply.status(201).send({})
    },
  )

  fastify.delete(
    '/subscriptions/:gameId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { gameId } = request.params as { gameId: string }
      const userId = request.user.sub
      let found = false

      await db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(adventureSubscriptions)
          .where(and(eq(adventureSubscriptions.gameId, gameId), eq(adventureSubscriptions.userId, userId)))
          .returning()

        if (!deleted) return

        await tx
          .delete(gameMembers)
          .where(and(
            eq(gameMembers.gameId, gameId),
            eq(gameMembers.userId, userId),
            eq(gameMembers.role, 'player'),
          ))

        found = true
      })

      if (!found) {
        request.log.warn({ gameId, userId }, 'subscription not found')
      } else {
        request.log.info({ gameId, userId }, 'user unsubscribed from adventure')
      }
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
        .from(adventureSubscriptions)
        .where(eq(adventureSubscriptions.userId, userId))
      return reply.send(subs)
    },
  )
}
