import type { FastifyPluginAsync } from 'fastify'
import { eq, and, gte, lte, desc, count } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, requestLogs, game, gameMembers } from '../db/schema.js'

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/admin/users/:id/promote',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!target) return reply.status(404).send({ error: 'User not found' })
      if (target.isSysAdmin) return reply.status(409).send({ error: 'User is already a sys_admin' })

      const [updated] = await db
        .update(users)
        .set({ isSysAdmin: true })
        .where(eq(users.id, id))
        .returning()

      const { passwordHash: _, ...safeUser } = updated!
      return reply.send(safeUser)
    },
  )

  fastify.delete(
    '/admin/users/:id/promote',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const requesterId = request.user.sub

      if (id === requesterId) return reply.status(400).send({ error: 'Cannot self-demote' })

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!target) return reply.status(404).send({ error: 'User not found' })

      const [updated] = await db
        .update(users)
        .set({ isSysAdmin: false })
        .where(eq(users.id, id))
        .returning()

      const { passwordHash: _, ...safeUser } = updated!
      return reply.send(safeUser)
    },
  )

  fastify.get(
    '/admin/logs',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { userId, from, to, limit = '100', offset = '0' } = request.query as {
        userId?: string
        from?: string
        to?: string
        limit?: string
        offset?: string
      }

      const limitN = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200)
      const offsetN = Math.max(parseInt(offset, 10) || 0, 0)

      const fromDate = from ? new Date(from) : undefined
      const toDate = to ? new Date(to) : undefined
      if (fromDate && isNaN(fromDate.getTime())) return reply.status(400).send({ error: 'Invalid from date' })
      if (toDate && isNaN(toDate.getTime())) return reply.status(400).send({ error: 'Invalid to date' })

      const filter = and(
        userId ? eq(requestLogs.userId, userId) : undefined,
        fromDate ? gte(requestLogs.createdAt, fromDate) : undefined,
        toDate ? lte(requestLogs.createdAt, toDate) : undefined,
      )

      const [{ total }] = await db.select({ total: count() }).from(requestLogs).where(filter)

      const items = await db
        .select()
        .from(requestLogs)
        .where(filter)
        .orderBy(desc(requestLogs.createdAt))
        .limit(limitN)
        .offset(offsetN)

      return reply.send({ total, items, limit: limitN, offset: offsetN })
    },
  )

  fastify.get(
    '/admin/logs/users/:userId',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const { limit = '100', offset = '0' } = request.query as { limit?: string; offset?: string }

      const limitN = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200)
      const offsetN = Math.max(parseInt(offset, 10) || 0, 0)

      const filter = eq(requestLogs.userId, userId)

      const [{ total }] = await db.select({ total: count() }).from(requestLogs).where(filter)

      const items = await db
        .select()
        .from(requestLogs)
        .where(filter)
        .orderBy(desc(requestLogs.createdAt))
        .limit(limitN)
        .offset(offsetN)

      return reply.send({ total, items, limit: limitN, offset: offsetN })
    },
  )

  fastify.get(
    '/admin/games',
    { preHandler: [fastify.requireSysAdmin] },
    async (_request, reply) => {
      const rows = await db
        .select({
          id: game.id,
          name: game.name,
          slug: game.slug,
          description: game.description,
          isPublic: game.isPublic,
          status: game.status,
          joinMode: game.joinMode,
          createdAt: game.createdAt,
          memberCount: count(gameMembers.id),
        })
        .from(game)
        .leftJoin(gameMembers, and(eq(gameMembers.gameId, game.id), eq(gameMembers.status, 'active')))
        .groupBy(game.id)
        .orderBy(desc(game.createdAt))

      return reply.send(rows)
    },
  )
}
