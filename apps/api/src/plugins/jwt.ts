import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../env.js'
import type { User } from '@larpdb/shared'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: User['role'] }
    user: { sub: string; role: User['role'] }
  }
}

declare module 'fastify' {
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
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}

export default fp(jwtPlugin)
