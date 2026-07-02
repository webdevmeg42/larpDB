import type { FastifyPluginAsync } from 'fastify'
import { or, isNull, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { schemaTemplates } from '../db/schema.js'

export const schemaTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/schema-templates',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const gameId = request.headers['x-game-id'] as string | undefined
      const rows = await db.select().from(schemaTemplates)
        .where(gameId
          ? or(isNull(schemaTemplates.gameId), eq(schemaTemplates.gameId, gameId))
          : isNull(schemaTemplates.gameId))
      return reply.send(rows)
    },
  )
}
