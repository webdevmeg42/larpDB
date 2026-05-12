import { describe, it, expect, beforeEach } from 'vitest'
import { buildApp } from '../src/app.js'

async function setupAndLogin() {
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
  const { token } = res.json()
  return { app, token }
}

describe('GET /game', () => {
  it('returns game info', async () => {
    const { app, token } = await setupAndLogin()

    const res = await app.inject({
      method: 'GET',
      url: '/game',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Realm of Shadows')
    await app.close()
  })

  it('returns 401 without token', async () => {
    const { app } = await setupAndLogin()
    const res = await app.inject({ method: 'GET', url: '/game' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('GET /config', () => {
  it('returns site config publicly', async () => {
    const { app } = await setupAndLogin()

    const res = await app.inject({ method: 'GET', url: '/config' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.siteTitle).toBe('Realm of Shadows')
    expect(body.colorPrimary).toBe('#6366f1')
    await app.close()
  })
})

describe('PATCH /config', () => {
  it('updates site config fields', async () => {
    const { app, token } = await setupAndLogin()

    const res = await app.inject({
      method: 'PATCH',
      url: '/config',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        siteTitle: 'Updated Title',
        colorPrimary: '#ff0000',
        welcomeMessage: 'Welcome to our game!',
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.siteTitle).toBe('Updated Title')
    expect(body.colorPrimary).toBe('#ff0000')
    expect(body.welcomeMessage).toBe('Welcome to our game!')
    await app.close()
  })

  it('returns 403 if caller is not owner', async () => {
    const { app } = await setupAndLogin()
    const playerToken = app.jwt.sign({ sub: 'fake-id', role: 'player' })

    const res = await app.inject({
      method: 'PATCH',
      url: '/config',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { siteTitle: 'Hacked' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 400 for invalid color format', async () => {
    const { app, token } = await setupAndLogin()

    const res = await app.inject({
      method: 'PATCH',
      url: '/config',
      headers: { authorization: `Bearer ${token}` },
      payload: { colorPrimary: 'not-a-hex' },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })
})
