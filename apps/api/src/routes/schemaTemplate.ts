import type { FastifyPluginAsync } from 'fastify'
import { or, isNull, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { schemaTemplates } from '../db/schema.js'

export const schemaTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/schema-templates',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId } = request.gameContext
      const rows = await db.select().from(schemaTemplates)
        .where(or(isNull(schemaTemplates.gameId), eq(schemaTemplates.gameId, gameId)))
      return reply.send(rows)
    },
  )
}
