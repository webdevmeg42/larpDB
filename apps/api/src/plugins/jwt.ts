import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../env.js'

export type GameContext = {
  userId: string
  gameId: string
  role: 'owner' | 'gm' | 'player'
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string; email: string; displayName: string }
    user: { sub: string; role: string; email: string; displayName: string }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    gameContext: GameContext
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, { secret: env.JWT_SECRET })

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}

export default fp(jwtPlugin)
