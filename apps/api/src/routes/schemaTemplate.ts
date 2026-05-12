import type { FastifyPluginAsync } from 'fastify'
import { db } from '../db/index.js'
import { schemaTemplates } from '../db/schema.js'

export const schemaTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/schema-templates', async (_request, reply) => {
    const rows = await db.select().from(schemaTemplates)
    return reply.send(rows)
  })
}
