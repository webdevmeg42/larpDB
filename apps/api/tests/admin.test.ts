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
