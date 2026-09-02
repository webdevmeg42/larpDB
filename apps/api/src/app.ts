import * as Sentry from '@sentry/node'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { env } from './env.js'
import jwtPlugin from './plugins/jwt.js'
import gameContextPlugin from './plugins/gameContext.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { gameRoutes } from './routes/game.js'
import { gamePublicRoutes } from './routes/gamePublic.js'
import { gameMemberRoutes } from './routes/gameMember.js'
import { schemaTemplateRoutes } from './routes/schemaTemplate.js'
import { characterSchemaRoutes } from './routes/characterSchema.js'
import { characterRoutes } from './routes/character.js'
import { characterXpRoutes } from './routes/characterXp.js'
import { eventRoutes } from './routes/event.js'
import { npcRoutes } from './routes/npc.js'
import { plotRoutes } from './routes/plot.js'
import { userRoutes } from './routes/user.js'
import { storeRoutes } from './routes/store.js'
import { uploadRoutes } from './routes/upload.js'
import { LOCAL_UPLOADS_DIR } from './lib/storage.js'
import { subscriptionRoutes } from './routes/subscription.js'
import { postRoutes } from './routes/post.js'
import { profileRoutes } from './routes/profile.js'
import { adminRoutes } from './routes/admin.js'
import { guestAuthRoutes } from './routes/guestAuth.js'
import { cleanupExpiredGuests } from './db/cleanup.js'
import { seedBuiltinTemplates } from './db/seeds/templates.js'
import { db } from './db/index.js'
import { requestLogs } from './db/schema.js'
import { lt } from 'drizzle-orm'

const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

async function purgeOldLogs() {
  const cutoff = new Date(Date.now() - LOG_RETENTION_MS)
  await db.delete(requestLogs).where(lt(requestLogs.createdAt, cutoff))
}

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    integrations: [Sentry.fastifyIntegration()],
    beforeSend(event) {
      const statusCode = event.contexts?.response?.status_code as number | undefined
      if (statusCode !== undefined && statusCode < 500) return null
      return event
    },
  })
}

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  })

  if (env.SENTRY_DSN) {
    Sentry.setupFastifyErrorHandler(app)
  }

  // Security: cookie must be registered before jwtPlugin so JWT can read cookies
  app.register(cookie)
  app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
  app.register(rateLimit, { global: false })
  app.register(cors, { origin: env.ALLOWED_ORIGIN, credentials: true })
  app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } })
  if (env.STORAGE_PROVIDER === 'local') {
    app.register(fastifyStatic, {
      root: LOCAL_UPLOADS_DIR,
      prefix: '/uploads/',
      decorateReply: false,
    })
  }
  app.register(jwtPlugin)
  app.register(gameContextPlugin)
  app.register(healthRoutes)
  app.register(authRoutes)
  app.register(guestAuthRoutes)
  app.register(gameRoutes)
  app.register(gamePublicRoutes)
  app.register(gameMemberRoutes)
  app.register(schemaTemplateRoutes)
  app.register(characterSchemaRoutes)
  app.register(characterRoutes)
  app.register(characterXpRoutes)
  app.register(eventRoutes)
  app.register(npcRoutes)
  app.register(plotRoutes)
  app.register(userRoutes)
  app.register(storeRoutes)
  app.register(uploadRoutes)
  app.register(subscriptionRoutes)
  app.register(postRoutes)
  app.register(profileRoutes)
  app.register(adminRoutes)

  app.addHook('onSend', async (request, reply, payload) => {
    try {
      const userId = (request.user as { sub: string } | undefined)?.sub ?? null
      if (userId) {
        await db.insert(requestLogs).values({
          userId,
          method: request.method,
          url: request.url.split('?')[0],
          statusCode: reply.statusCode,
          durationMs: Math.round(reply.elapsedTime),
        })
      }
    } catch {
      // logging failures must never affect the response
    }
    return payload
  })

  app.addHook('onReady', async () => {
    if (env.NODE_ENV !== 'test') {
      await seedBuiltinTemplates()
      await purgeOldLogs()
      try {
        await cleanupExpiredGuests()
        const guestTimer = setInterval(cleanupExpiredGuests, 60 * 60 * 1000)
        guestTimer.unref()
      } catch (err) {
        app.log.warn({ err }, 'cleanupExpiredGuests failed on startup — guest columns may not be migrated yet')
      }
      const logTimer = setInterval(purgeOldLogs, 24 * 60 * 60 * 1000)
      logTimer.unref()
    }
  })

  return app
}
