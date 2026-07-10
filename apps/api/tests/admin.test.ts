import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { buildApp } from '../src/app.js'
import { testDb } from './setup.js'
import { users, requestLogs } from '../src/db/schema.js'

async function registerAndLogin(app: ReturnType<typeof buildApp>, email = 'user@test.com') {
  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email, password: 'password123', displayName: 'Test User' },
  })
  const { token, user } = regRes.json()
  return { token, userId: user.id as string }
}

async function createSysAdmin(app: ReturnType<typeof buildApp>, email = 'admin@test.com') {
  const { userId } = await registerAndLogin(app, email)
  await testDb.update(users).set({ isSysAdmin: true }).where(eq(users.id, userId))
  // Re-login so the JWT reflects isSysAdmin: true
  const loginRes = await app.inject({
    method: 'POST', url: '/auth/login',
    payload: { email, password: 'password123' },
  })
  return { token: loginRes.json().token as string, userId }
}

describe('isSysAdmin in JWT', () => {
  it('is false for a newly registered user', async () => {
    const app = buildApp()
    await app.ready()

    const { token } = await registerAndLogin(app)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    expect(payload.isSysAdmin).toBe(false)

    await app.close()
  })

  it('is true after being promoted and re-logging in', async () => {
    const app = buildApp()
    await app.ready()

    const { token } = await createSysAdmin(app)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    expect(payload.isSysAdmin).toBe(true)

    await app.close()
  })
})

describe('POST /admin/users/:id/promote', () => {
  it('promotes a user to sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { userId: targetId } = await registerAndLogin(app, 'target@test.com')

    const res = await app.inject({
      method: 'POST',
      url: `/admin/users/${targetId}/promote`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().isSysAdmin).toBe(true)
    expect(res.json().passwordHash).toBeUndefined()
    await app.close()
  })

  it('returns 409 when user is already sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken, userId: adminId } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'POST',
      url: `/admin/users/${adminId}/promote`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 404 when user does not exist', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'POST',
      url: '/admin/users/00000000-0000-0000-0000-000000000000/promote',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('returns 403 for non-sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token, userId } = await registerAndLogin(app)

    const res = await app.inject({
      method: 'POST',
      url: `/admin/users/${userId}/promote`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('DELETE /admin/users/:id/promote', () => {
  it('demotes a sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { userId: targetId } = await registerAndLogin(app, 'target@test.com')

    await app.inject({
      method: 'POST',
      url: `/admin/users/${targetId}/promote`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/admin/users/${targetId}/promote`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().isSysAdmin).toBe(false)
    expect(res.json().passwordHash).toBeUndefined()
    await app.close()
  })

  it('returns 400 when self-demoting', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken, userId: adminId } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'DELETE',
      url: `/admin/users/${adminId}/promote`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('returns 404 when user does not exist', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'DELETE',
      url: '/admin/users/00000000-0000-0000-0000-000000000000/promote',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('returns 403 for non-sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token, userId } = await registerAndLogin(app)

    const res = await app.inject({
      method: 'DELETE',
      url: `/admin/users/${userId}/promote`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('sys_admin game context bypass', () => {
  it('allows sys_admin to access any game without membership', async () => {
    const app = buildApp()
    await app.ready()

    const { token: ownerToken } = await registerAndLogin(app, 'owner@test.com')
    const gameRes = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: 'Private LARP' },
    })
    const { id: gameId } = gameRes.json()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')

    const res = await app.inject({
      method: 'GET',
      url: '/events',
      headers: { authorization: `Bearer ${adminToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    await app.close()
  })

  it('returns 404 for sys_admin with a non-existent game id', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'GET',
      url: '/events',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'x-game-id': '00000000-0000-0000-0000-000000000000',
      },
    })

    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('audit log', () => {
  it('records authenticated requests in request_logs', async () => {
    const app = buildApp()
    await app.ready()

    const { token, userId } = await registerAndLogin(app, 'logger@test.com')

    await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Log Test Game' },
    })

    const logs = await testDb
      .select()
      .from(requestLogs)
      .where(eq(requestLogs.userId, userId))

    expect(logs.length).toBeGreaterThan(0)
    const log = logs.find(l => l.method === 'POST' && l.url === '/games')
    expect(log).toBeDefined()
    expect(log!.statusCode).toBe(201)
    expect(log!.durationMs).toBeGreaterThanOrEqual(0)

    await app.close()
  })

  it('does not record unauthenticated requests', async () => {
    const app = buildApp()
    await app.ready()

    await app.inject({ method: 'GET', url: '/games' })

    const logs = await testDb.select().from(requestLogs)
    expect(logs.length).toBe(0)

    await app.close()
  })
})

describe('GET /admin/logs', () => {
  it('returns paginated logs across all users', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { token: userToken } = await registerAndLogin(app, 'user@test.com')

    await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'Game 1' },
    })

    const res = await app.inject({
      method: 'GET', url: '/admin/logs',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.total).toBe('number')
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBeGreaterThan(0)
    await app.close()
  })

  it('filters logs by userId', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { token: userToken, userId } = await registerAndLogin(app, 'user@test.com')

    await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'Game 1' },
    })

    const res = await app.inject({
      method: 'GET', url: `/admin/logs?userId=${userId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items.every((l: { userId: string }) => l.userId === userId)).toBe(true)
    await app.close()
  })

  it('returns 403 for non-sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token } = await registerAndLogin(app)

    const res = await app.inject({
      method: 'GET', url: '/admin/logs',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})


describe('GET /admin/games', () => {
  it('returns all games regardless of status and visibility', async () => {
    const app = buildApp()
    await app.ready()

    const { token: ownerToken } = await registerAndLogin(app, 'owner@test.com')
    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')

    // Create a public active game
    const g1 = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: 'Public Active' },
    })
    await app.inject({
      method: 'PATCH', url: `/games/${g1.json().id}/status`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'active' },
    })

    // Create a private inactive game (default state)
    await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: 'Private Inactive' },
    })

    const res = await app.inject({
      method: 'GET', url: '/admin/games',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.length).toBe(2)
    expect(body.every((g: { memberCount: number }) => typeof g.memberCount === 'number')).toBe(true)
    await app.close()
  })

  it('returns 403 for non-sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token } = await registerAndLogin(app)

    const res = await app.inject({
      method: 'GET', url: '/admin/games',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /admin/logs — enriched with user info', () => {
  it('includes userDisplayName and userEmail in log items', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { token: userToken } = await registerAndLogin(app, 'user@test.com')

    await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'Enriched Log Test' },
    })

    const res = await app.inject({
      method: 'GET', url: '/admin/logs',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    const entry = body.items.find((l: { userEmail: string }) => l.userEmail === 'user@test.com')
    expect(entry).toBeDefined()
    expect(entry.userDisplayName).toBe('Test User')
    expect(entry.userEmail).toBe('user@test.com')

    await app.close()
  })
})

describe('GET /admin/users', () => {
  it('returns all platform users with id, displayName, email, isSysAdmin, createdAt', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    await registerAndLogin(app, 'user@test.com')

    const res = await app.inject({
      method: 'GET', url: '/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(2)
    const u = body.find((u: { email: string }) => u.email === 'user@test.com')
    expect(u).toBeDefined()
    expect(u.displayName).toBe('Test User')
    expect(u.isSysAdmin).toBe(false)
    expect(typeof u.createdAt).toBe('string')

    await app.close()
  })

  it('returns 403 for non-sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token } = await registerAndLogin(app)

    const res = await app.inject({
      method: 'GET', url: '/admin/users',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})
