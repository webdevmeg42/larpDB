import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, gameMembers } from '../db/schema.js'
import { LoginInput, RegisterInput } from '@plotrunner/shared'

const ROLE_ORDER = { owner: 3, gm: 2, player: 1 } as const

// We fetch all active memberships and pick the best role in JS rather than using
// ORDER BY + LIMIT 1 because the list is always tiny (one row per game) and future
// JWT claims may need all membership data anyway — not worth an extra round-trip
async function highestRole(userId: string): Promise<'owner' | 'gm' | 'player'> {
  const rows = await db
    .select({ role: gameMembers.role })
    .from(gameMembers)
    .where(and(eq(gameMembers.userId, userId), eq(gameMembers.status, 'active')))
  return rows.reduce<'owner' | 'gm' | 'player'>((best, { role }) => {
    return (ROLE_ORDER[role] ?? 0) > ROLE_ORDER[best] ? role : best
  }, 'player')
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  async function signResponse(user: typeof users.$inferSelect) {
    const role = await highestRole(user.id)
    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      isSysAdmin: user.isSysAdmin,
      role,
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
    if (!user) {
      request.log.warn({ email }, "login attempt for unknown email")
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      request.log.warn({ email }, "login failed — password didn't match")
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    request.log.info({ userId: user.id, email }, "user logged in")
    return reply.status(200).send(await signResponse(user))
  })

  fastify.post('/auth/register', async (request, reply) => {
    const result = RegisterInput.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
    }
    const { email, password, displayName } = result.data

    // Pre-check for the common case, but concurrent registrations can both pass this
    // before either commits — the 23505 catch below is the real uniqueness guard
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing) {
      request.log.warn({ email }, "registration rejected — email already in use")
      return reply.status(409).send({ error: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    let newUser: typeof users.$inferSelect | undefined
    try {
      ;[newUser] = await db.insert(users).values({ email, passwordHash, displayName }).returning()
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        return reply.status(409).send({ error: 'Email already in use' })
      }
      throw err
    }
    if (!newUser) throw new Error('Failed to create user')

    request.log.info({ userId: newUser.id, email }, "new user registered")
    return reply.status(201).send(await signResponse(newUser))
  })
}
