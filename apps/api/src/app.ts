import Fastify from 'fastify'
import { env } from './env.js'

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  })
  return app
}
