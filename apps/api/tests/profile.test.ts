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

async function createUser(email = `profile-test-${Date.now()}@example.com`) {
  const app = buildApp()
  await app.ready()
  const res = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email, password: 'password123', displayName: 'Test User' },
  })
  const { token, user } = res.json()
  return { app, token, userId: user.id }
}

afterEach(() => {
  if (fs.existsSync(UPLOADS_DIR)) {
    for (const f of fs.readdirSync(UPLOADS_DIR)) {
      fs.unlinkSync(path.join(UPLOADS_DIR, f))
    }
  }
})

describe('GET /profile', () => {
  it('returns current user without passwordHash', async () => {
    const { app, token } = await createUser()
    const res = await app.inject({
      method: 'GET', url: '/profile',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.email).toBeDefined()
    expect(body.displayName).toBe('Test User')
    expect(body.phone).toBeNull()
    expect(body.passwordHash).toBeUndefined()
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/profile' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('PATCH /profile', () => {
  it('updates displayName and returns fresh token', async () => {
    const { app, token } = await createUser()
    const res = await app.inject({
      method: 'PATCH', url: '/profile',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { displayName: 'New Name' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.displayName).toBe('New Name')
    expect(body.token).toBeTypeOf('string')
    expect(body.token).not.toBe(token)
    await app.close()
  })

  it('updates phone number', async () => {
    const { app, token } = await createUser()
    const res = await app.inject({
      method: 'PATCH', url: '/profile',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { phone: '555-1234' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.phone).toBe('555-1234')
    await app.close()
  })

  it('returns 409 when email already in use', async () => {
    const email1 = `conflict-a-${Date.now()}@example.com`
    const email2 = `conflict-b-${Date.now()}@example.com`
    const { app, token } = await createUser(email1)
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: email2, password: 'password123', displayName: 'Other' },
    })
    const res = await app.inject({
      method: 'PATCH', url: '/profile',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { email: email2 },
    })
    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 400 when no fields provided', async () => {
    const { app, token } = await createUser()
    const res = await app.inject({
      method: 'PATCH', url: '/profile',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('POST /profile/avatar', () => {
  it('uploads avatar and updates avatarUrl', async () => {
    const { app, token } = await createUser()
    const boundary = 'testboundary'
    const body = buildMultipartBody(boundary, 'avatar.png', 'image/png', Buffer.from('fakepng'))
    const res = await app.inject({
      method: 'POST', url: '/profile/avatar',
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })
    expect(res.statusCode).toBe(200)
    const user = res.json()
    expect(user.avatarUrl).toMatch(/^\/uploads\/.+\.png$/)
    await app.close()
  })

  it('returns 400 for non-image MIME type', async () => {
    const { app, token } = await createUser()
    const boundary = 'testboundary'
    const body = buildMultipartBody(boundary, 'evil.exe', 'application/octet-stream', Buffer.from('nope'))
    const res = await app.inject({
      method: 'POST', url: '/profile/avatar',
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    await app.ready()
    const boundary = 'testboundary'
    const body = buildMultipartBody(boundary, 'a.png', 'image/png', Buffer.from('x'))
    const res = await app.inject({
      method: 'POST', url: '/profile/avatar',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('POST /profile/password', () => {
  it('changes password successfully', async () => {
    const email = `pw-change-${Date.now()}@example.com`
    const { app, token } = await createUser(email)
    const res = await app.inject({
      method: 'POST', url: '/profile/password',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { currentPassword: 'password123', newPassword: 'newpassword99', confirmPassword: 'newpassword99' },
    })
    expect(res.statusCode).toBe(204)

    // Verify new password works
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email, password: 'newpassword99' },
    })
    expect(loginRes.statusCode).toBe(200)
    await app.close()
  })

  it('returns 401 for wrong current password', async () => {
    const { app, token } = await createUser()
    const res = await app.inject({
      method: 'POST', url: '/profile/password',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { currentPassword: 'wrongpassword', newPassword: 'newpassword99', confirmPassword: 'newpassword99' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 400 when passwords do not match', async () => {
    const { app, token } = await createUser()
    const res = await app.inject({
      method: 'POST', url: '/profile/password',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { currentPassword: 'password123', newPassword: 'newpassword99', confirmPassword: 'differentpassword' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('returns 400 when new password is too short', async () => {
    const { app, token } = await createUser()
    const res = await app.inject({
      method: 'POST', url: '/profile/password',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { currentPassword: 'password123', newPassword: 'short', confirmPassword: 'short' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})
