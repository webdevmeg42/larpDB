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

describe('GET /games/:slug/public', () => {
  it('includes color and font fields in the public response', async () => {
    const { app, token, gameId } = await createAndLogin()

    // Set some color/font values via the config endpoint
    await app.inject({
      method: 'PATCH',
      url: '/config',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: {
        colorPrimary: '#8B4513',
        colorSecondary: '#D2691E',
        colorBackground: '#1A0E00',
        colorText: '#F5DEB3',
        colorAccent: '#DAA520',
        fontHeading: 'Cinzel',
        fontBody: 'Rye',
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/games/realm-of-shadows/public',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.colorPrimary).toBe('#8B4513')
    expect(body.colorSecondary).toBe('#D2691E')
    expect(body.colorBackground).toBe('#1A0E00')
    expect(body.colorText).toBe('#F5DEB3')
    expect(body.colorAccent).toBe('#DAA520')
    expect(body.fontHeading).toBe('Cinzel')
    expect(body.fontBody).toBe('Rye')
    await app.close()
  })

  it('returns DB-default colors and fonts for a freshly created game', async () => {
    const { app } = await createAndLogin()

    const res = await app.inject({
      method: 'GET',
      url: '/games/realm-of-shadows/public',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.colorPrimary).toBe('#6366f1')
    expect(body.colorBackground).toBe('#0f0f1a')
    expect(body.colorSecondary).toBe('#a78bfa')
    expect(body.colorAccent).toBe('#f59e0b')
    expect(body.fontHeading).toBe('Inter')
    expect(body.fontBody).toBe('Inter')
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

async function setupAdminMemberTest() {
  const app = buildApp()
  await app.ready()

  const ownerRegRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email: 'adminmemowner@example.com', password: 'password123', displayName: 'Admin Owner' },
  })
  const { token: ownerToken } = ownerRegRes.json()

  const gameRes = await app.inject({
    method: 'POST', url: '/games',
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { name: 'Member Test LARP' },
  })
  const { id: gameId } = gameRes.json()

  await app.inject({
    method: 'PATCH', url: `/games/${gameId}/status`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { status: 'active' },
  })

  const playerRegRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email: 'adminmemplayer@example.com', password: 'password123', displayName: 'Admin Player' },
  })
  const { token: playerToken } = playerRegRes.json()

  await app.inject({
    method: 'POST', url: '/subscriptions',
    headers: { authorization: `Bearer ${playerToken}` },
    payload: { gameId },
  })

  return { app, ownerToken, playerToken, gameId }
}

describe('GET /admin-members', () => {
  it('owner sees all members', async () => {
    const { app, ownerToken } = await setupAdminMemberTest()

    const res = await app.inject({
      method: 'GET', url: '/admin-members',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { games: Array<{ id: string; name: string; members: Array<{ role: string; displayName: string }> }> }
    expect(body.games.length).toBe(1)
    expect(body.games[0].name).toBe('Member Test LARP')
    expect(body.games[0].members.length).toBe(2)
    const ownerMember = body.games[0].members.find(m => m.role === 'owner')
    expect(ownerMember).toBeDefined()
    expect(ownerMember!.displayName).toBe('Admin Owner')
    const playerMember = body.games[0].members.find((m: { role: string }) => m.role === 'player')
    expect(playerMember).toBeDefined()
    await app.close()
  })

  it('GM sees members across their games', async () => {
    const { app, ownerToken, gameId } = await setupAdminMemberTest()

    const gmRegRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'adminmemgm@example.com', password: 'password123', displayName: 'Admin GM' },
    })
    const { token: gmToken, user: gmUser } = gmRegRes.json()

    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { gameId },
    })
    await app.inject({
      method: 'PATCH', url: `/games/${gameId}/members/${gmUser.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { role: 'gm' },
    })

    const res = await app.inject({
      method: 'GET', url: '/admin-members',
      headers: { authorization: `Bearer ${gmToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { games: Array<{ members: unknown[] }> }
    expect(body.games).toHaveLength(1)
    expect(body.games[0].members.length).toBeGreaterThan(0)
    await app.close()
  })

  it('player gets empty games list', async () => {
    const { app, playerToken } = await setupAdminMemberTest()

    const res = await app.inject({
      method: 'GET', url: '/admin-members',
      headers: { authorization: `Bearer ${playerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { games: unknown[] }
    expect(body.games.length).toBe(0)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/admin-members' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('game with only owner shows 1 member', async () => {
    const app = buildApp()
    await app.ready()

    const regRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: `solo-owner-${Date.now()}@example.com`, password: 'password123', displayName: 'Solo Owner' },
    })
    const { token: ownerToken } = regRes.json()

    const gameRes = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: 'Solo LARP' },
    })
    const { id: gameId } = gameRes.json()

    const res = await app.inject({
      method: 'GET', url: '/admin-members',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { games: Array<{ members: unknown[] }> }
    expect(body.games.length).toBe(1)
    expect(body.games[0].members.length).toBe(1)
    await app.close()
  })
})

describe('GET /admin-subscriptions', () => {
  it('owner sees subscribers', async () => {
    const { app, ownerToken } = await setupAdminMemberTest()

    const res = await app.inject({
      method: 'GET', url: '/admin-subscriptions',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { games: Array<{ id: string; name: string; subscribers: Array<{ displayName: string; email: string }> }> }
    expect(body.games.length).toBe(1)
    expect(body.games[0].subscribers.length).toBe(1)
    expect(body.games[0].subscribers[0].displayName).toBe('Admin Player')
    expect(body.games[0].subscribers[0].email).toBe('adminmemplayer@example.com')
    await app.close()
  })

  it('GM sees subscriptions across their games', async () => {
    const { app, ownerToken, gameId } = await setupAdminMemberTest()

    const gmRegRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'adminsubgm@example.com', password: 'password123', displayName: 'Sub GM' },
    })
    const { token: gmToken, user: gmUser } = gmRegRes.json()

    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { gameId },
    })
    await app.inject({
      method: 'PATCH', url: `/games/${gameId}/members/${gmUser.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { role: 'gm' },
    })

    const res = await app.inject({
      method: 'GET', url: '/admin-subscriptions',
      headers: { authorization: `Bearer ${gmToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { games: Array<{ subscribers: unknown[] }> }
    expect(body.games).toHaveLength(1)
    expect(body.games[0].subscribers.length).toBeGreaterThan(0)
    await app.close()
  })

  it('player gets empty games list', async () => {
    const { app, playerToken } = await setupAdminMemberTest()

    const res = await app.inject({
      method: 'GET', url: '/admin-subscriptions',
      headers: { authorization: `Bearer ${playerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { games: unknown[] }
    expect(body.games.length).toBe(0)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/admin-subscriptions' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('game with no subscribers shows empty array', async () => {
    const app = buildApp()
    await app.ready()

    const regRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: `nosub-owner-${Date.now()}@example.com`, password: 'password123', displayName: 'NoSub Owner' },
    })
    const { token: ownerToken } = regRes.json()

    await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: 'Empty Sub LARP' },
    })

    const res = await app.inject({
      method: 'GET', url: '/admin-subscriptions',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { games: Array<{ subscribers: unknown[] }> }
    expect(body.games.length).toBe(1)
    expect(body.games[0].subscribers.length).toBe(0)
    await app.close()
  })
})
