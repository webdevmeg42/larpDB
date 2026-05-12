import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import jwtPlugin from './plugins/jwt.js'
import { authRoutes } from './routes/auth.js'
import { gameRoutes } from './routes/game.js'

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  })

  app.register(cors, { origin: true })
  app.register(jwtPlugin)
  app.register(authRoutes)
  app.register(gameRoutes)

  return app
}
