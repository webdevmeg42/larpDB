import type { FastifyPluginAsync } from 'fastify'
import { and, or, isNull, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { schemaTemplates, gameMembers } from '../db/schema.js'

export const schemaTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/schema-templates',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const gameId = request.headers['x-game-id'] as string | undefined
      const { type } = request.query as { type?: string }

      let verifiedGameId: string | undefined
      if (gameId) {
        const userId = request.user.sub
        const [membership] = await db
          .select({ id: gameMembers.id })
          .from(gameMembers)
          .where(
            and(
              eq(gameMembers.gameId, gameId),
              eq(gameMembers.userId, userId),
              eq(gameMembers.status, 'active'),
            ),
          )
          .limit(1)
        if (membership) verifiedGameId = gameId
      }

      const gameCondition = verifiedGameId
        ? or(isNull(schemaTemplates.gameId), eq(schemaTemplates.gameId, verifiedGameId))
        : isNull(schemaTemplates.gameId)

      const typeCondition = type === 'race' || type === 'class'
        ? or(eq(schemaTemplates.type, type), isNull(schemaTemplates.type))
        : undefined

      const rows = await db.select().from(schemaTemplates)
        .where(typeCondition ? and(gameCondition, typeCondition) : gameCondition)

      return reply.send(rows)
    },
  )
}
