import type { FastifyPluginAsync } from 'fastify'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { gmOrOwner } from '../lib/roles.js'
import { IMAGE_MIME_TYPES, IMAGE_MIME_TO_EXT, VIDEO_MIME_TYPES, VIDEO_MIME_TO_EXT } from '../lib/mimeTypes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES])
const MIME_TO_EXT: Record<string, string> = { ...IMAGE_MIME_TO_EXT, ...VIDEO_MIME_TO_EXT }

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
