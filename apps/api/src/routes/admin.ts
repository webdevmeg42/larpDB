import type { FastifyPluginAsync } from 'fastify'
import { eq, and, gte, lte, desc, count, ilike } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../db/index.js'
import { users, requestLogs, game, gameMembers, characters } from '../db/schema.js'
import { parsePagination } from '../lib/pagination.js'
import { stripPassword } from '../lib/user.js'

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/admin/users/:id/promote',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!target) {
        request.log.warn({ userId: request.user.sub, targetUserId: id }, "user not found for promotion")
        return reply.status(404).send({ error: 'User not found' })
      }
      if (target.isSysAdmin) {
        request.log.warn({ userId: request.user.sub, targetUserId: id }, "user is already a system admin")
        return reply.status(409).send({ error: 'User is already a sys_admin' })
      }

      const [updated] = await db
        .update(users)
        .set({ isSysAdmin: true })
        .where(eq(users.id, id))
        .returning()

      request.log.info({ userId: request.user.sub, targetUserId: id }, "user promoted to system admin")
      const safeUser = stripPassword(updated!)
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
        request.log.warn({ userId: id }, "system admin tried to self-demote")
        return reply.status(400).send({ error: 'Cannot self-demote' })
      }

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!target) {
        request.log.warn({ userId: requesterId, targetUserId: id }, "user not found for demotion")
        return reply.status(404).send({ error: 'User not found' })
      }

      const [updated] = await db
        .update(users)
        .set({ isSysAdmin: false })
        .where(eq(users.id, id))
        .returning()

      request.log.info({ userId: requesterId, targetUserId: id }, "user demoted from system admin")
      const safeUser = stripPassword(updated!)
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
    async (request, reply) => {
      const { ownerName } = request.query as { ownerName?: string }
      const ownerMember = alias(gameMembers, 'owner_member')

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
          ownerId: ownerMember.userId,
          ownerDisplayName: users.displayName,
        })
        .from(game)
        .leftJoin(gameMembers, and(eq(gameMembers.gameId, game.id), eq(gameMembers.status, 'active')))
        .leftJoin(ownerMember, and(eq(ownerMember.gameId, game.id), eq(ownerMember.role, 'owner')))
        .leftJoin(users, eq(users.id, ownerMember.userId))
        .where(ownerName ? ilike(users.displayName, `%${ownerName}%`) : undefined)
        .groupBy(game.id, ownerMember.userId, users.displayName)
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

  fastify.get('/admin/characters', { preHandler: [fastify.requireSysAdmin] }, async (request, reply) => {
    const rows = await db
      .select({
        id: characters.id,
        name: characters.name,
        gameId: characters.gameId,
        gameName: game.name,
        playerDisplayName: users.displayName,
        totalXp: characters.totalXp,
        isActive: characters.isActive,
        createdAt: characters.createdAt,
      })
      .from(characters)
      .innerJoin(game, eq(characters.gameId, game.id))
      .innerJoin(users, eq(characters.userId, users.id))
      .orderBy(desc(characters.createdAt))

    return reply.send(rows)
  })
}
