import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'

const SetRoleInput = z.object({
  role: z.enum(['gm', 'player']),
})

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/users',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
      return reply.send(rows)
    },
  )

  fastify.patch(
    '/users/:id/role',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.user.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const { id } = request.params as { id: string }
      const result = SetRoleInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!existing) return reply.status(404).send({ error: 'User not found' })
      if (existing.role === 'owner') {
        return reply.status(403).send({ error: 'Cannot change owner role' })
      }

      const [updated] = await db
        .update(users)
        .set({ role: result.data.role })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          createdAt: users.createdAt,
        })

      return reply.send(updated)
    },
  )
}
