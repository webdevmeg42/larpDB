import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { game, gameMembers } from '../db/schema.js'
import { UpdateMemberInput } from '@larpdb/shared'
import { gmOrOwner, buildPatch } from '../lib/roles.js'

const validStatuses = ['active', 'pending', 'banned'] as const

export const gameMemberRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/games/:gameId/join',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { gameId } = request.params as { gameId: string }
      const userId = request.user.sub

      const [targetGame] = await db.select().from(game).where(eq(game.id, gameId)).limit(1)
      if (!targetGame) return reply.status(404).send({ error: 'Game not found' })

      const [existing] = await db
        .select()
        .from(gameMembers)
        .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)))
        .limit(1)
      if (existing) return reply.status(409).send({ error: 'Already a member of this game' })

      const status = targetGame.joinMode === 'open' ? 'active' : 'pending'
      const [member] = await db.insert(gameMembers).values({
        gameId,
        userId,
        role: 'player',
        status,
      }).returning()

      return reply.status(201).send(member)
    },
  )

  fastify.get(
    '/games/:gameId/members',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId } = request.params as { gameId: string }
      if (request.gameContext.gameId !== gameId) return reply.status(403).send({ error: 'Forbidden' })
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const { status } = request.query as { status?: string }
      const statusFilter = validStatuses.includes(status as never) ? (status as typeof validStatuses[number]) : undefined
      const conditions = [eq(gameMembers.gameId, gameId), ...(statusFilter ? [eq(gameMembers.status, statusFilter)] : [])]
      const rows = await db.select().from(gameMembers).where(and(...conditions))

      return reply.send(rows)
    },
  )

  fastify.patch(
    '/games/:gameId/members/:userId',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, userId } = request.params as { gameId: string; userId: string }
      if (request.gameContext.gameId !== gameId) return reply.status(403).send({ error: 'Forbidden' })
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const result = UpdateMemberInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [member] = await db
        .select()
        .from(gameMembers)
        .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)))
        .limit(1)
      if (!member) return reply.status(404).send({ error: 'Member not found' })

      const [updated] = await db
        .update(gameMembers)
        .set(buildPatch(result.data) as Parameters<ReturnType<typeof db.update<typeof gameMembers>>['set']>[0])
        .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)))
        .returning()

      return reply.send(updated)
    },
  )
}
