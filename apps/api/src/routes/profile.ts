import type { FastifyPluginAsync } from 'fastify'
import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { db } from '../db/index.js'
import { users, gameMembers } from '../db/schema.js'
import { UpdateProfileInput, ChangePasswordInput } from '@plotrunner/shared'
import { UPLOADS_DIR } from './upload.js'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
])
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
}

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/profile',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [user] = await db.select().from(users).where(eq(users.id, request.user.sub)).limit(1)
      if (!user) return reply.status(404).send({ error: 'User not found' })
      const { passwordHash: _, ...safeUser } = user
      return reply.send(safeUser)
    },
  )

  fastify.patch(
    '/profile',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = UpdateProfileInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const userId = request.user.sub

      if (result.data.email) {
        const [conflict] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, result.data.email))
          .limit(1)
        if (conflict && conflict.id !== userId) {
          request.log.warn({ userId, email: result.data.email }, "profile update rejected — email already in use by another account")
          return reply.status(409).send({ error: 'Email already in use' })
        }
      }

      const patch: Record<string, unknown> = {}
      if (result.data.displayName !== undefined) patch.displayName = result.data.displayName
      if (result.data.email !== undefined) patch.email = result.data.email
      if (result.data.phone !== undefined) patch.phone = result.data.phone

      let updated: typeof users.$inferSelect | undefined
      try {
        ;[updated] = await db.update(users).set(patch).where(eq(users.id, userId)).returning()
      } catch (err: unknown) {
        if ((err as { code?: string }).code === '23505') {
          return reply.status(409).send({ error: 'Email already in use' })
        }
        throw err
      }
      if (!updated) return reply.status(404).send({ error: 'User not found' })

      const { passwordHash: _, ...safeUser } = updated

      const ROLE_ORDER = { owner: 3, gm: 2, player: 1 } as const
      const memberships = await db
        .select({ role: gameMembers.role })
        .from(gameMembers)
        .where(and(eq(gameMembers.userId, userId), eq(gameMembers.status, 'active')))
      const role = memberships.reduce<'owner' | 'gm' | 'player'>((best, { role: r }) => {
        return (ROLE_ORDER[r] ?? 0) > ROLE_ORDER[best] ? r : best
      }, 'player')

      const token = fastify.jwt.sign({
        sub: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        isSysAdmin: updated.isSysAdmin,
        role,
      })

      request.log.info({ userId }, "profile updated")
      return reply.send({ user: safeUser, token })
    },
  )

  fastify.post(
    '/profile/avatar',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return reply.status(400).send({ error: 'No file provided' })

      if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
        data.file.resume()
        return reply.status(400).send({ error: 'Only image files are accepted' })
      }

      const ext = MIME_TO_EXT[data.mimetype]
      const filename = `${randomUUID()}.${ext}`
      const filepath = path.join(UPLOADS_DIR, filename)

      await pipeline(data.file, fs.createWriteStream(filepath))

      // Read current avatar before overwriting
      const [current] = await db
        .select({ id: users.id, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, request.user.sub))
        .limit(1)
      if (!current) {
        await fs.promises.unlink(filepath).catch(() => {})
        return reply.status(404).send({ error: 'User not found' })
      }

      const avatarUrl = `/uploads/${filename}`
      const [updated] = await db
        .update(users)
        .set({ avatarUrl })
        .where(eq(users.id, request.user.sub))
        .returning()
      if (!updated) {
        await fs.promises.unlink(filepath).catch(() => {})
        return reply.status(404).send({ error: 'User not found' })
      }

      // Delete old avatar file if it was a local upload
      if (current.avatarUrl?.startsWith('/uploads/')) {
        const oldFilename = path.basename(current.avatarUrl)
        const oldPath = path.join(UPLOADS_DIR, oldFilename)
        await fs.promises.unlink(oldPath).catch(() => {})
      }

      const { passwordHash: _, ...safeUser } = updated
      return reply.send(safeUser)
    },
  )

  fastify.post(
    '/profile/password',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = ChangePasswordInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [user] = await db.select().from(users).where(eq(users.id, request.user.sub)).limit(1)
      if (!user) return reply.status(404).send({ error: 'User not found' })

      const valid = await bcrypt.compare(result.data.currentPassword, user.passwordHash)
      if (!valid) {
        request.log.warn({ userId: user.id }, "password change failed — current password incorrect")
        return reply.status(401).send({ error: 'Current password is incorrect' })
      }

      const passwordHash = await bcrypt.hash(result.data.newPassword, 12)
      await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))

      request.log.info({ userId: user.id }, "password changed")
      return reply.status(204).send()
    },
  )
}
