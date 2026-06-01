import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { gameMembers } from '../db/schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    requireGameContext: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const gameContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('requireGameContext', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const gameId = request.headers['x-game-id'] as string | undefined
    if (!gameId) {
      return reply.status(400).send({ error: 'X-Game-Id header required' })
    }

    const userId = request.user.sub
    const [member] = await db
      .select()
      .from(gameMembers)
      .where(
        and(
          eq(gameMembers.gameId, gameId),
          eq(gameMembers.userId, userId),
          eq(gameMembers.status, 'active'),
        ),
      )
      .limit(1)

    if (!member) {
      return reply.status(403).send({ error: 'Not a member of this game' })
    }

    request.gameContext = { userId, gameId, role: member.role }
  })
}

export default fp(gameContextPlugin)
