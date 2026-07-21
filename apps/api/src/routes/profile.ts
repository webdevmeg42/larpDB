import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { UpdateProfileInput, ChangePasswordInput } from '@plotrunner/shared'
import { UPLOADS_DIR } from './upload.js'
import { highestRole } from './auth.js'
import { stripPassword } from '../lib/user.js'
import { IMAGE_MIME_TYPES, IMAGE_MIME_TO_EXT } from '../lib/mimeTypes.js'

const ALLOWED_MIME_TYPES = new Set(IMAGE_MIME_TYPES)
const MIME_TO_EXT = IMAGE_MIME_TO_EXT

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/profile',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [user] = await db.select().from(users).where(eq(users.id, request.user.sub)).limit(1)
      if (!user) return reply.status(404).send({ error: 'User not found' })
      return reply.send(stripPassword(user))
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

      const role = await highestRole(userId)

      const token = fastify.jwt.sign({
        sub: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        isSysAdmin: updated.isSysAdmin,
        role,
      }, { expiresIn: '7d' })
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })

      request.log.info({ userId }, "profile updated")
      return reply.send({ user: stripPassword(updated) })
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

      return reply.send(stripPassword(updated))
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
