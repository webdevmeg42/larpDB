import type { FastifyPluginAsync } from 'fastify'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { gmOrOwner } from '../lib/roles.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/upload',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      if (!gmOrOwner(request.gameContext.role)) {
        request.log.warn({ userId: request.gameContext.userId, role: request.gameContext.role }, "non-staff tried to upload a file")
        return reply.status(403).send({ error: 'Owner or GM role required' })
      }

      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' })
      }

      if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
        request.log.warn({ mimetype: data.mimetype, userId: request.gameContext.userId }, "upload rejected — unsupported file type")
        data.file.resume()
        return reply.status(400).send({ error: 'Only image or video files are accepted' })
      }

      const ext = MIME_TO_EXT[data.mimetype]
      const filename = `${randomUUID()}.${ext}`
      const filepath = path.join(UPLOADS_DIR, filename)

      await pipeline(data.file, fs.createWriteStream(filepath)).catch(async (err) => {
        await fs.promises.unlink(filepath).catch(() => {})
        throw err
      })

      if (data.file.truncated) {
        await fs.promises.unlink(filepath)
        request.log.warn({ filename, userId: request.gameContext.userId }, "upload rejected — file exceeded 100MB limit")
        return reply.status(413).send({ error: 'File must be under 100MB' })
      }

      request.log.info({ filename, mimetype: data.mimetype, userId: request.gameContext.userId }, "file uploaded successfully")
      return reply.send({ url: `/uploads/${filename}` })
    },
  )
}
