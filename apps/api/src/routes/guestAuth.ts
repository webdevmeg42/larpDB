import type { FastifyPluginAsync } from 'fastify'
import crypto from 'node:crypto'
import { db } from '../db/index.js'
import { users, game, gameMembers } from '../db/schema.js'
import { seedDemoGame } from '../db/demoSeed.js'

export const guestAuthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/auth/guest', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const userId = crypto.randomUUID()
    const gameId = crypto.randomUUID()
    const guestNumber = Math.floor(Math.random() * 9000) + 1000
    const guestExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const guestEmail = `guest-${userId}@guest.plotrunner.run`
    const displayName = `Wanderer #${guestNumber}`

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: guestEmail,
        passwordHash: crypto.randomBytes(32).toString('hex'),
        displayName,
        isGuest: true,
        guestExpiresAt,
      })

      await tx.insert(game).values({
        id: gameId,
        name: `Thornwood Chronicles (${userId.slice(0, 8)})`,
        slug: `thornwood-${userId.slice(0, 8)}`,
        isPublic: false,
        status: 'active',
      })

      await tx.insert(gameMembers).values({
        gameId,
        userId,
        role: 'owner',
        status: 'active',
      })
    })

    // Seed after transaction so it can use the committed data
    await seedDemoGame(userId, gameId)

    const token = fastify.jwt.sign({
      sub: userId,
      email: guestEmail,
      displayName,
      isSysAdmin: false,
      isGuest: true,
      role: 'owner' as const,
    }, { expiresIn: '24h' })

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.COOKIE_DOMAIN,
      maxAge: 60 * 60 * 24,
    })

    return reply.status(200).send({ gameId })
  })
}
