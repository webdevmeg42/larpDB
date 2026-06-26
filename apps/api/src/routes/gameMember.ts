import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { gameMembers, larpSubscriptions, users } from '../db/schema.js'
import { UpdateMemberInput } from '@larpdb/shared'
import { gmOrOwner, buildPatch } from '../lib/roles.js'

const validStatuses = ['active', 'pending', 'banned'] as const

export const gameMemberRoutes: FastifyPluginAsync = async (fastify) => {
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

      const rows = await db
        .select({
          id: gameMembers.id,
          userId: gameMembers.userId,
          role: gameMembers.role,
          status: gameMembers.status,
          joinedAt: gameMembers.joinedAt,
          displayName: users.displayName,
          email: users.email,
        })
        .from(gameMembers)
        .innerJoin(users, eq(gameMembers.userId, users.id))
        .where(and(...conditions))

      return reply.send(rows)
    },
  )

  fastify.get(
    '/games/:gameId/subscriptions',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId } = request.params as { gameId: string }
      if (request.gameContext.gameId !== gameId) return reply.status(403).send({ error: 'Forbidden' })
      if (!gmOrOwner(request.gameContext.role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const rows = await db
        .select({
          id: larpSubscriptions.id,
          userId: larpSubscriptions.userId,
          subscribedAt: larpSubscriptions.createdAt,
          displayName: users.displayName,
          email: users.email,
        })
        .from(larpSubscriptions)
        .innerJoin(users, eq(larpSubscriptions.userId, users.id))
        .where(eq(larpSubscriptions.gameId, gameId))

      return reply.send(rows)
    },
  )

  fastify.patch(
    '/games/:gameId/members/:userId/role',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, userId } = request.params as { gameId: string; userId: string }
      if (request.gameContext.gameId !== gameId) return reply.status(403).send({ error: 'Forbidden' })
      if (request.gameContext.role !== 'owner') return reply.status(403).send({ error: 'Owner role required' })

      const { role } = request.body as { role: string }
      if (role !== 'gm' && role !== 'player') {
        return reply.status(400).send({ error: 'Role must be gm or player' })
      }

      const [member] = await db
        .select()
        .from(gameMembers)
        .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)))
        .limit(1)
      if (!member) return reply.status(404).send({ error: 'Member not found' })
      if (member.role === 'owner') return reply.status(400).send({ error: 'Cannot change owner role' })

      const [updated] = await db
        .update(gameMembers)
        .set({ role })
        .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)))
        .returning()

      return reply.send(updated)
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
