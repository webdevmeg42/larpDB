import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

describe('POST /auth/register', () => {
  it('creates a user and returns token', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player@example.com', password: 'password123', displayName: 'Player One' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user.email).toBe('player@example.com')
    expect(body.user.passwordHash).toBeUndefined()
    expect(body.user.role).toBeUndefined()
    expect(body.token).toBeTypeOf('string')
    await app.close()
  })

  it('returns 409 when email already in use', async () => {
    const app = buildApp()
    await app.ready()

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player@example.com', password: 'password123', displayName: 'Player One' },
    })

    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player@example.com', password: 'password123', displayName: 'Player Two' },
    })

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
  it('returns token for valid credentials', async () => {
    const app = buildApp()
    await app.ready()

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player@example.com', password: 'password123', displayName: 'Player' },
    })

    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'player@example.com', password: 'password123' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBeTypeOf('string')
    expect(body.user.passwordHash).toBeUndefined()
    await app.close()
  })

  it('returns 401 for wrong password', async () => {
    const app = buildApp()
    await app.ready()

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player@example.com', password: 'password123', displayName: 'Player' },
    })

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
