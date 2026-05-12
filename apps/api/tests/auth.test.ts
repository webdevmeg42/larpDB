import { describe, it, expect, beforeEach } from 'vitest'
import { buildApp } from '../src/app.js'
import { testDb } from './setup.js'
import { users, game, siteConfig } from '../src/db/schema.js'

describe('POST /auth/setup', () => {
  it('creates the first owner, game, and site config', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/setup',
      payload: {
        email: 'owner@example.com',
        password: 'password123',
        displayName: 'Game Master',
        gameName: 'Realm of Shadows',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user.email).toBe('owner@example.com')
    expect(body.user.role).toBe('owner')
    expect(body.user.passwordHash).toBeUndefined()
    expect(body.token).toBeTypeOf('string')

    const dbUsers = await testDb.select().from(users)
    expect(dbUsers).toHaveLength(1)
    expect(dbUsers[0]?.role).toBe('owner')

    const dbGames = await testDb.select().from(game)
    expect(dbGames).toHaveLength(1)
    expect(dbGames[0]?.name).toBe('Realm of Shadows')

    const dbConfigs = await testDb.select().from(siteConfig)
    expect(dbConfigs).toHaveLength(1)

    await app.close()
  })

  it('returns 409 if setup has already been completed', async () => {
    const app = buildApp()
    await app.ready()

    await app.inject({
      method: 'POST',
      url: '/auth/setup',
      payload: {
        email: 'owner@example.com',
        password: 'password123',
        displayName: 'Game Master',
        gameName: 'Realm of Shadows',
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/setup',
      payload: {
        email: 'other@example.com',
        password: 'password123',
        displayName: 'Another',
        gameName: 'Another Game',
      },
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 400 for invalid input', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/setup',
      payload: { email: 'not-an-email', password: '123' },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    const app = buildApp()
    await app.ready()
    await app.inject({
      method: 'POST',
      url: '/auth/setup',
      payload: {
        email: 'owner@example.com',
        password: 'password123',
        displayName: 'Game Master',
        gameName: 'Realm of Shadows',
      },
    })
    await app.close()
  })

  it('returns token and user for valid credentials', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'owner@example.com', password: 'password123' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBeTypeOf('string')
    expect(body.user.email).toBe('owner@example.com')
    expect(body.user.passwordHash).toBeUndefined()

    await app.close()
  })

  it('returns 401 for wrong password', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'owner@example.com', password: 'wrongpassword' },
    })

    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 401 for unknown email', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'password123' },
    })

    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
