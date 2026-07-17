import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

async function registerUser(app: Awaited<ReturnType<typeof buildApp>>, email = 'player@example.com') {
  return app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email, password: 'password123', displayName: 'Player One' },
  })
}

describe('POST /auth/register', () => {
  it('creates a user, sets httpOnly cookie, returns user without token', async () => {
    const app = buildApp()
    await app.ready()

    const res = await registerUser(app)

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user.email).toBe('player@example.com')
    expect(body.user.id).toBeTypeOf('string')
    expect(body.user.role).toBeTypeOf('string')
    expect(body.user.passwordHash).toBeUndefined()
    expect(body.token).toBeUndefined()
    const setCookie = res.headers['set-cookie'] as string | string[]
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie ?? '')
    expect(cookieHeader).toContain('token=')
    expect(cookieHeader).toContain('HttpOnly')
    await app.close()
  })

  it('returns 409 when email already in use', async () => {
    const app = buildApp()
    await app.ready()
    await registerUser(app)
    const res = await registerUser(app)
    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 400 for invalid input', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'not-an-email', password: '123' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('POST /auth/login', () => {
  it('sets httpOnly cookie for valid credentials, no token in body', async () => {
    const app = buildApp()
    await app.ready()
    await registerUser(app)

    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'player@example.com', password: 'password123' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.email).toBe('player@example.com')
    expect(body.token).toBeUndefined()
    expect(body.user.passwordHash).toBeUndefined()
    const setCookie = res.headers['set-cookie'] as string | string[]
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie ?? '')
    expect(cookieHeader).toContain('token=')
    expect(cookieHeader).toContain('HttpOnly')
    await app.close()
  })

  it('returns 401 for wrong password', async () => {
    const app = buildApp()
    await app.ready()
    await registerUser(app)
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'player@example.com', password: 'wrongpass' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 401 for unknown email', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('POST /auth/logout', () => {
  it('clears the token cookie', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST', url: '/auth/logout',
    })

    expect(res.statusCode).toBe(200)
    const setCookie = res.headers['set-cookie'] as string | string[]
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie ?? '')
    expect(cookieHeader).toContain('token=;')
    await app.close()
  })
})

describe('GET /auth/me', () => {
  it('returns user for valid cookie', async () => {
    const app = buildApp()
    await app.ready()

    const regRes = await registerUser(app)
    const setCookie = regRes.headers['set-cookie'] as string | string[]
    const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie
    const tokenMatch = rawCookie?.match(/token=([^;]+)/)
    const tokenValue = tokenMatch?.[1] ?? ''

    const meRes = await app.inject({
      method: 'GET', url: '/auth/me',
      cookies: { token: tokenValue },
    })

    expect(meRes.statusCode).toBe(200)
    const body = meRes.json()
    expect(body.email).toBe('player@example.com')
    expect(body.id).toBeTypeOf('string')
    expect(body.passwordHash).toBeUndefined()
    await app.close()
  })

  it('returns 401 without cookie', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
