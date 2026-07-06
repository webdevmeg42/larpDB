import type { FastifyPluginAsync } from 'fastify'
import { and, or, isNull, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { schemaTemplates } from '../db/schema.js'

export const schemaTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/schema-templates',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const gameId = request.headers['x-game-id'] as string | undefined
      const { type } = request.query as { type?: string }

      const gameCondition = gameId
        ? or(isNull(schemaTemplates.gameId), eq(schemaTemplates.gameId, gameId))
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
