import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { gameMembers, game } from '../db/schema.js'
import { getCachedMembership, setCachedMembership } from '../lib/membershipCache.js'

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
      reply.status(401).send({ error: 'Unauthorized' }); return
    }

    const gameId = request.headers['x-game-id'] as string | undefined
    if (!gameId) {
      reply.status(400).send({ error: 'X-Game-Id header required' }); return
    }

    const userId = request.user.sub

    if (request.user.isSysAdmin) {
      const [gameRow] = await db
        .select({ status: game.status })
        .from(game)
        .where(eq(game.id, gameId))
        .limit(1)
      if (!gameRow) { reply.status(404).send({ error: 'Game not found' }); return }
      // role: 'owner' is intentional — sys_admin has full write access across all Adventures
      request.gameContext = { userId, gameId, role: 'owner', gameStatus: gameRow.status }
      return
    }

    const bypassCache = request.headers['x-bypass-cache'] === '1'
    if (!bypassCache) {
      const cached = getCachedMembership(userId, gameId)
      if (cached) {
        request.gameContext = { userId, gameId, role: cached.role, gameStatus: cached.gameStatus }
        return
      }
    }

    const [row] = await db
      .select({ role: gameMembers.role, gameStatus: game.status })
      .from(gameMembers)
      .innerJoin(game, eq(game.id, gameMembers.gameId))
      .where(
        and(
          eq(gameMembers.gameId, gameId),
          eq(gameMembers.userId, userId),
          eq(gameMembers.status, 'active'),
        ),
      )
      .limit(1)

    if (!row) {
      reply.status(403).send({ error: 'Not a member of this game' }); return
    }

    setCachedMembership(userId, gameId, { role: row.role, gameStatus: row.gameStatus })
    request.gameContext = { userId, gameId, role: row.role, gameStatus: row.gameStatus }
  })
}

export default fp(gameContextPlugin)
