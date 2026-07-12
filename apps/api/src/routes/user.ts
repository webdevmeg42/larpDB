import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, gameMembers } from '../db/schema.js'

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/users',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (request.gameContext.role !== 'owner') {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-owner tried to list users")
        return reply.status(403).send({ error: 'Owner role required' })
      }
      const { gameId } = request.gameContext
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
          role: gameMembers.role,
          status: gameMembers.status,
        })
        .from(gameMembers)
        .innerJoin(users, eq(gameMembers.userId, users.id))
        .where(eq(gameMembers.gameId, gameId))
      return reply.send(rows)
    },
  )
}
