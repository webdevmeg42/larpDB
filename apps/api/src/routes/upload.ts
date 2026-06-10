// apps/api/src/routes/upload.ts
import type { FastifyPluginAsync } from 'fastify'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/upload',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (request.gameContext.role !== 'owner') {
        return reply.status(403).send({ error: 'Owner role required' })
      }

      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' })
      }

      if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
        data.file.resume()
        return reply.status(400).send({ error: 'Only image files are accepted' })
      }

      const ext = MIME_TO_EXT[data.mimetype]
      const filename = `${randomUUID()}.${ext}`
      const filepath = path.join(UPLOADS_DIR, filename)

      await pipeline(data.file, fs.createWriteStream(filepath))

      if (data.file.truncated) {
        await fs.promises.unlink(filepath)
        return reply.status(413).send({ error: 'File must be under 100MB' })
      }

      return reply.send({ url: `/uploads/${filename}` })
    },
  )
}
