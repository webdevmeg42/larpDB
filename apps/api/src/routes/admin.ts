import type { FastifyPluginAsync } from 'fastify'
import { eq, and, gte, lte, desc, count } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, requestLogs, game, gameMembers } from '../db/schema.js'
import { parsePagination } from '../lib/pagination.js'

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/admin/users/:id/promote',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!target) {
        request.log.warn({ id, requesterId: request.user.sub }, "user not found for promotion")
        return reply.status(404).send({ error: 'User not found' })
      }
      if (target.isSysAdmin) {
        request.log.warn({ id, requesterId: request.user.sub }, "user is already a system admin")
        return reply.status(409).send({ error: 'User is already a sys_admin' })
      }

      const [updated] = await db
        .update(users)
        .set({ isSysAdmin: true })
        .where(eq(users.id, id))
        .returning()

      request.log.info({ id, requesterId: request.user.sub }, "user promoted to system admin")
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

      if (id === requesterId) {
        request.log.warn({ id }, "system admin tried to self-demote")
        return reply.status(400).send({ error: 'Cannot self-demote' })
      }

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!target) {
        request.log.warn({ id, requesterId }, "user not found for demotion")
        return reply.status(404).send({ error: 'User not found' })
      }

      const [updated] = await db
        .update(users)
        .set({ isSysAdmin: false })
        .where(eq(users.id, id))
        .returning()

      request.log.info({ id, requesterId }, "user demoted from system admin")
      const { passwordHash: _, ...safeUser } = updated!
      return reply.send(safeUser)
    },
  )

  fastify.get(
    '/admin/logs',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { userId, from, to } = request.query as {
        userId?: string
        from?: string
        to?: string
      }
      const { limit: limitN, offset: offsetN } = parsePagination(
        request.query as { limit?: string; offset?: string },
        { limit: 100, maxLimit: 200 },
      )

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
        .select({
          id: requestLogs.id,
          userId: requestLogs.userId,
          userDisplayName: users.displayName,
          userEmail: users.email,
          method: requestLogs.method,
          url: requestLogs.url,
          statusCode: requestLogs.statusCode,
          durationMs: requestLogs.durationMs,
          createdAt: requestLogs.createdAt,
        })
        .from(requestLogs)
        .leftJoin(users, eq(users.id, requestLogs.userId))
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

  fastify.get(
    '/admin/users',
    { preHandler: [fastify.requireSysAdmin] },
    async (_request, reply) => {
      const allUsers = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          isSysAdmin: users.isSysAdmin,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.displayName)
      return reply.send(allUsers)
    },
  )
}
