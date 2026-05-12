import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { game, siteConfig } from '../db/schema.js'
import { UpdateSiteConfigInput } from '@larpdb/shared'

export const gameRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/game',
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      const [gameRow] = await db.select().from(game).limit(1)
      if (!gameRow) {
        return reply.status(404).send({ error: 'Game not configured' })
      }
      return reply.send(gameRow)
    },
  )

  fastify.get('/config', async (_request, reply) => {
    const [configRow] = await db.select().from(siteConfig).limit(1)
    if (!configRow) {
      return reply.status(404).send({ error: 'Site config not found' })
    }
    return reply.send(configRow)
  })

  fastify.patch(
    '/config',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const result = UpdateSiteConfigInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [existing] = await db.select().from(siteConfig).limit(1)
      if (!existing) {
        return reply.status(404).send({ error: 'Site config not found' })
      }

      // Zod spreads include `undefined` for absent optional fields; filter before passing to Drizzle
      const patch = Object.fromEntries(
        Object.entries({ ...result.data, updatedAt: new Date() }).filter(([, v]) => v !== undefined),
      ) as Parameters<ReturnType<typeof db.update<typeof siteConfig>>['set']>[0]

      const [updated] = await db
        .update(siteConfig)
        .set(patch)
        .where(eq(siteConfig.id, existing.id))
        .returning()

      return reply.send(updated)
    },
  )
}
