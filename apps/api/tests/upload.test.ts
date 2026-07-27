import { describe, it, expect, afterEach } from 'vitest'
import { buildApp } from '../src/app.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')

function buildMultipartBody(boundary: string, filename: string, mimetype: string, content: Buffer): Buffer {
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n`
  const footer = `\r\n--${boundary}--\r\n`
  return Buffer.concat([Buffer.from(header), content, Buffer.from(footer)])
}

async function createOwnerWithGame() {
  const app = buildApp()
  await app.ready()

  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email: `upload-test-${Date.now()}@example.com`, password: 'password123', displayName: 'GM' },
  })
  const { token } = regRes.json()

  const gameRes = await app.inject({
    method: 'POST', url: '/games',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Upload Test Game' },
  })
  const { id: gameId } = gameRes.json()

  return { app, token, gameId }
}

describe('POST /upload', () => {
  afterEach(() => {
    // clean up any files written during tests
    if (fs.existsSync(UPLOADS_DIR)) {
      for (const f of fs.readdirSync(UPLOADS_DIR)) {
        fs.unlinkSync(path.join(UPLOADS_DIR, f))
      }
    }
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    await app.ready()
    const boundary = 'testboundary'
    const body = buildMultipartBody(boundary, 'test.jpg', 'image/jpeg', Buffer.from('fake'))
    const res = await app.inject({
      method: 'POST', url: '/upload',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 400 for non-image MIME type', async () => {
    const { app, token, gameId } = await createOwnerWithGame()
    const boundary = 'testboundary'
    const body = buildMultipartBody(boundary, 'evil.exe', 'application/octet-stream', Buffer.from('notanimage'))
    const res = await app.inject({
      method: 'POST', url: '/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'x-game-id': gameId,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Only image or video files are accepted')
    await app.close()
  })

  it('returns 400 when no file is provided', async () => {
    const { app, token, gameId } = await createOwnerWithGame()
    const boundary = 'testboundary'
    const emptyBody = `--${boundary}--\r\n`
    const res = await app.inject({
      method: 'POST', url: '/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'x-game-id': gameId,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(emptyBody),
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('saves file and returns url for valid image upload', async () => {
    const { app, token, gameId } = await createOwnerWithGame()
    const boundary = 'testboundary'
    const body = buildMultipartBody(boundary, 'logo.png', 'image/png', Buffer.from('fakepngdata'))
    const res = await app.inject({
      method: 'POST', url: '/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'x-game-id': gameId,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    expect(res.statusCode).toBe(200)
    const { url } = res.json()
    expect(url).toMatch(/^\/uploads\/.+\.png$/)
    await app.close()
  })

  it('returns 403 for non-owner member', async () => {
    const { app, token: ownerToken, gameId } = await createOwnerWithGame()

    const regRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: `player-${Date.now()}@example.com`, password: 'password123', displayName: 'Player' },
    })
    const { token: playerToken, user } = regRes.json()

    await app.inject({
      method: 'POST', url: '/game-members',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { userId: user.id, role: 'player' },
    })

    const boundary = 'testboundary'
    const body = buildMultipartBody(boundary, 'logo.png', 'image/png', Buffer.from('fakepngdata'))
    const res = await app.inject({
      method: 'POST', url: '/upload',
      headers: {
        authorization: `Bearer ${playerToken}`,
        'x-game-id': gameId,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 400 for SVG upload (security risk)', async () => {
    const { app, token, gameId } = await createOwnerWithGame()
    const boundary = 'testboundary'
    const body = buildMultipartBody(boundary, 'malicious.svg', 'image/svg+xml', Buffer.from('<svg><script>alert("xss")</script></svg>'))
    const res = await app.inject({
      method: 'POST', url: '/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'x-game-id': gameId,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Only image or video files are accepted')
    await app.close()
  })
})
