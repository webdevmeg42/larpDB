import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/admin/users/:id/promote',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!target) return reply.status(404).send({ error: 'User not found' })
      if (target.isSysAdmin) return reply.status(409).send({ error: 'User is already a sys_admin' })

      const [updated] = await db
        .update(users)
        .set({ isSysAdmin: true })
        .where(eq(users.id, id))
        .returning()

      const { passwordHash: _, ...safeUser } = updated!
      return reply.send(safeUser)
    },
  )

  fastify.delete(
    '/admin/users/:id/promote',
    { preHandler: [fastify.requireSysAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const requesterId = request.user.sub

      if (id === requesterId) return reply.status(400).send({ error: 'Cannot self-demote' })

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!target) return reply.status(404).send({ error: 'User not found' })

      const [updated] = await db
        .update(users)
        .set({ isSysAdmin: false })
        .where(eq(users.id, id))
        .returning()

      const { passwordHash: _, ...safeUser } = updated!
      return reply.send(safeUser)
    },
  )
}
