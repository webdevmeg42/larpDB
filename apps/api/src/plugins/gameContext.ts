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
      throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    }

    const gameId = request.headers['x-game-id'] as string | undefined
    if (!gameId) {
      throw Object.assign(new Error('X-Game-Id header required'), { statusCode: 400 })
    }

    const userId = request.user.sub

    if (request.user.isSysAdmin) {
      const [gameRow] = await db
        .select({ status: game.status, isBlocked: game.isBlocked })
        .from(game)
        .where(eq(game.id, gameId))
        .limit(1)
      if (!gameRow) {
        throw Object.assign(new Error('Game not found'), { statusCode: 404 })
      }
      if (gameRow.isBlocked) {
        throw Object.assign(new Error('Adventure not available'), { statusCode: 403 })
      }
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
      .select({ role: gameMembers.role, gameStatus: game.status, isBlocked: game.isBlocked })
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
      throw Object.assign(new Error('Not a member of this game'), { statusCode: 403 })
    }
    if (row.isBlocked) {
      throw Object.assign(new Error('Adventure not available'), { statusCode: 403 })
    }

    setCachedMembership(userId, gameId, { role: row.role, gameStatus: row.gameStatus })
    request.gameContext = { userId, gameId, role: row.role, gameStatus: row.gameStatus }
  })
}

export default fp(gameContextPlugin)
