import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

async function createAndLogin(email = 'owner@example.com') {
  const app = buildApp()
  await app.ready()

  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email, password: 'password123', displayName: 'Game Master' },
  })
  const { token } = regRes.json()

  const gameRes = await app.inject({
    method: 'POST', url: '/games',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Realm of Shadows' },
  })
  const { id: gameId } = gameRes.json()

  await app.inject({
    method: 'PATCH',
    url: `/games/${gameId}/status`,
    headers: { authorization: `Bearer ${token}` },
    payload: { status: 'active' },
  })

  return { app, token, gameId }
}

describe('POST /games', () => {
  it('creates a game and makes caller owner', async () => {
    const app = buildApp()
    await app.ready()

    const regRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'gm@example.com', password: 'password123', displayName: 'GM' },
    })
    const { token } = regRes.json()

    const res = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'My LARP Game' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('My LARP Game')
    expect(body.slug).toBe('my-larp-game')
    expect(body.joinMode).toBe('open')
    expect(body.status).toBe('inactive')
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({
      method: 'POST', url: '/games',
      payload: { name: 'Test' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('GET /games', () => {
  it('lists public games with pagination envelope', async () => {
    const { app } = await createAndLogin()

    const res = await app.inject({ method: 'GET', url: '/games' })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { items: Array<{ slug: string }>; total: number; limit: number; offset: number }
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.items[0].slug).toBeDefined()
    expect(body.total).toBeGreaterThan(0)
    await app.close()
  })
})

describe('GET /games/:slug', () => {
  it('returns a game by slug', async () => {
    const { app } = await createAndLogin()

    const res = await app.inject({ method: 'GET', url: '/games/realm-of-shadows' })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Realm of Shadows')
    await app.close()
  })

  it('returns 404 for unknown slug', async () => {
    const { app } = await createAndLogin()
    const res = await app.inject({ method: 'GET', url: '/games/nope' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('GET /game', () => {
  it('returns game info with game context', async () => {
    const { app, token, gameId } = await createAndLogin()

    const res = await app.inject({
      method: 'GET', url: '/game',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Realm of Shadows')
    await app.close()
  })

  it('returns 401 without token', async () => {
    const { app, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'GET', url: '/game',
      headers: { 'x-game-id': gameId },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('GET /config', () => {
  it('returns site config with X-Game-Id header', async () => {
    const { app, gameId } = await createAndLogin()

    const res = await app.inject({
      method: 'GET', url: '/config',
      headers: { 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().siteTitle).toBe('Realm of Shadows')
    await app.close()
  })

  it('returns 400 when X-Game-Id is missing', async () => {
    const { app } = await createAndLogin()
    const res = await app.inject({ method: 'GET', url: '/config' })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('PATCH /config', () => {
  it('updates site config fields as owner', async () => {
    const { app, token, gameId } = await createAndLogin()

    const res = await app.inject({
      method: 'PATCH', url: '/config',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { siteTitle: 'Updated Title', colorPrimary: '#ff0000' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().siteTitle).toBe('Updated Title')
    await app.close()
  })

  it('returns 403 if caller is player', async () => {
    const { app, gameId } = await createAndLogin()

    const reg2 = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'player@example.com', password: 'password123', displayName: 'Player' },
    })
    const { token: playerToken } = reg2.json()
    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { gameId },
    })

    const res = await app.inject({
      method: 'PATCH', url: '/config',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { siteTitle: 'Hacked' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 400 for invalid color format', async () => {
    const { app, token, gameId } = await createAndLogin()

    const res = await app.inject({
      method: 'PATCH', url: '/config',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { colorPrimary: 'not-a-hex' },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('GET /my-games', () => {
  it('returns games the user is a member of', async () => {
    const { app, token } = await createAndLogin(`my-games-owner-${Date.now()}@example.com`)
    const res = await app.inject({
      method: 'GET',
      url: '/my-games',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<{ role: string; memberCount: number; status: string }>
    expect(body.length).toBeGreaterThan(0)
    expect(body[0].role).toBe('owner')
    expect(body[0].memberCount).toBeGreaterThan(0)
    expect(body[0].status).toBe('active')
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/my-games' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('PATCH /games/:id/status', () => {
  it('deactivates a game as owner', async () => {
    const { app, token, gameId } = await createAndLogin(`status-owner-${Date.now()}@example.com`)
    const res = await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'inactive' },
    })
    expect(res.statusCode).toBe(200)
    expect((res.json() as { status: string }).status).toBe('inactive')
    await app.close()
  })

  it('returns 403 for non-member', async () => {
    const { app, gameId } = await createAndLogin(`status-owner2-${Date.now()}@example.com`)
    const reg2 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: `status-player-${Date.now()}@example.com`, password: 'password123', displayName: 'Player' },
    })
    const { token: playerToken } = reg2.json() as { token: string }
    const res = await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { status: 'inactive' },
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const { app, gameId } = await createAndLogin(`status-unauth-${Date.now()}@example.com`)
    const res = await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/status`,
      payload: { status: 'inactive' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('DELETE /games/:id', () => {
  it('deletes a game as owner', async () => {
    const { app, token, gameId } = await createAndLogin(`delete-owner-${Date.now()}@example.com`)
    const res = await app.inject({
      method: 'DELETE',
      url: `/games/${gameId}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
    await app.close()
  })

  it('returns 403 for non-member', async () => {
    const { app, gameId } = await createAndLogin(`delete-owner2-${Date.now()}@example.com`)
    const reg2 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: `delete-player-${Date.now()}@example.com`, password: 'password123', displayName: 'Player' },
    })
    const { token: playerToken } = reg2.json() as { token: string }
    const res = await app.inject({
      method: 'DELETE',
      url: `/games/${gameId}`,
      headers: { authorization: `Bearer ${playerToken}` },
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const { app, gameId } = await createAndLogin(`delete-unauth-${Date.now()}@example.com`)
    const res = await app.inject({
      method: 'DELETE',
      url: `/games/${gameId}`,
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('GET /games hides inactive games', () => {
  it('excludes inactive games from public list', async () => {
    const { app, token, gameId } = await createAndLogin(`hidden-owner-${Date.now()}@example.com`)
    // Verify game appears in public list before deactivating
    const beforeRes = await app.inject({ method: 'GET', url: '/games' })
    const before = beforeRes.json() as { items: Array<{ id: string }> }
    expect(before.items.some(g => g.id === gameId)).toBe(true)

    // Deactivate the game
    await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'inactive' },
    })

    const afterRes = await app.inject({ method: 'GET', url: '/games' })
    const after = afterRes.json() as { items: Array<{ id: string }> }
    expect(after.items.some(g => g.id === gameId)).toBe(false)
    await app.close()
  })
})
