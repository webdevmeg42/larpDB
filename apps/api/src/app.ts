import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import fs from 'fs'
import { env } from './env.js'
import jwtPlugin from './plugins/jwt.js'
import gameContextPlugin from './plugins/gameContext.js'
import { authRoutes } from './routes/auth.js'
import { gameRoutes } from './routes/game.js'
import { gameMemberRoutes } from './routes/gameMember.js'
import { schemaTemplateRoutes } from './routes/schemaTemplate.js'
import { characterSchemaRoutes } from './routes/characterSchema.js'
import { characterRoutes } from './routes/character.js'
import { eventRoutes } from './routes/event.js'
import { npcRoutes } from './routes/npc.js'
import { plotRoutes } from './routes/plot.js'
import { userRoutes } from './routes/user.js'
import { storeRoutes } from './routes/store.js'
import { uploadRoutes, UPLOADS_DIR } from './routes/upload.js'
import { subscriptionRoutes } from './routes/subscription.js'
import { postRoutes } from './routes/post.js'
import { profileRoutes } from './routes/profile.js'
import { adminRoutes } from './routes/admin.js'
import { seedBuiltinTemplates } from './db/seeds/templates.js'

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  })

  app.register(cors, { origin: true })
  app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } })
  app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  })
  app.register(jwtPlugin)
  app.register(gameContextPlugin)
  app.register(authRoutes)
  app.register(gameRoutes)
  app.register(gameMemberRoutes)
  app.register(schemaTemplateRoutes)
  app.register(characterSchemaRoutes)
  app.register(characterRoutes)
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

  app.addHook('onReady', async () => {
    await fs.promises.mkdir(UPLOADS_DIR, { recursive: true })
    if (env.NODE_ENV !== 'test') {
      await seedBuiltinTemplates()
    }
  })

  return app
}
