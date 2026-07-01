import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { LoginInput, RegisterInput } from '@larpdb/shared'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  function signResponse(user: typeof users.$inferSelect) {
    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      isSysAdmin: user.isSysAdmin,
    })
    const { passwordHash: _, ...safeUser } = user
    return { user: safeUser, token }
  }

  fastify.post('/auth/login', async (request, reply) => {
    const result = LoginInput.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
    }
    const { email, password } = result.data

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    return reply.status(200).send(signResponse(user))
  })

  fastify.post('/auth/register', async (request, reply) => {
    const result = RegisterInput.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
    }
    const { email, password, displayName } = result.data

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing) return reply.status(409).send({ error: 'Email already in use' })

    const passwordHash = await bcrypt.hash(password, 12)
    const [newUser] = await db.insert(users).values({ email, passwordHash, displayName }).returning()
    if (!newUser) throw new Error('Failed to create user')

    return reply.status(201).send(signResponse(newUser))
  })
}
