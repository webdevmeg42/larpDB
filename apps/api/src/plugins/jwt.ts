import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../env.js'

export type GameContext = {
  userId: string
  gameId: string
  role: 'owner' | 'gm' | 'player'
  gameStatus: 'active' | 'inactive'
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; displayName: string; isSysAdmin: boolean; isGuest: boolean; role: 'owner' | 'gm' | 'player' }
    user:    { sub: string; email: string; displayName: string; isSysAdmin: boolean; isGuest: boolean; role: 'owner' | 'gm' | 'player' }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    gameContext: GameContext
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireSysAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  })

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  fastify.decorate('requireSysAdmin', async function (request: FastifyRequest, reply: FastifyReply) {
    await fastify.authenticate(request, reply)
    if (reply.sent) return
    if (!request.user.isSysAdmin) return reply.status(403).send({ error: 'Forbidden' })
  })
}

export default fp(jwtPlugin)
