import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
      return reply.send({ status: 'ok', db: 'ok' })
    } catch {
      return reply.status(503).send({ status: 'degraded', db: 'error' })
    }
  })
}
