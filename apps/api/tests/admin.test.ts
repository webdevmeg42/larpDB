import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { buildApp } from '../src/app.js'
import { testDb } from './setup.js'
import { users, requestLogs, characters, characterSchemas, game, gameMembers } from '../src/db/schema.js'
import { extractToken, registerAndLogin } from './utils.js'

async function createSysAdmin(app: ReturnType<typeof buildApp>, email = 'admin@test.com') {
  const { userId } = await registerAndLogin(app, email)
  await testDb.update(users).set({ isSysAdmin: true }).where(eq(users.id, userId))
  // Re-login so the JWT reflects isSysAdmin: true
  const loginRes = await app.inject({
    method: 'POST', url: '/auth/login',
    payload: { email, password: 'password123' },
  })
  const token = extractToken(loginRes.headers as Record<string, unknown>)
  return { token, userId }
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

  it('includes ownerId and ownerDisplayName in the response', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')

    const ownerReg = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'owner@test.com', password: 'password123', displayName: 'Named Owner' },
    })
    const ownerId = ownerReg.json().user.id as string
    const ownerCookie = (ownerReg.headers['set-cookie'] as string[] | string)
    const ownerCookieHeader = Array.isArray(ownerCookie) ? ownerCookie.join('; ') : (ownerCookie ?? '')

    await app.inject({
      method: 'POST', url: '/games',
      headers: { cookie: ownerCookieHeader },
      payload: { name: 'Named Owner Game' },
    })

    const adminLoginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' },
    })
    const adminCookie = (adminLoginRes.headers['set-cookie'] as string[] | string)
    const adminCookieHeader = Array.isArray(adminCookie) ? adminCookie.join('; ') : (adminCookie ?? '')

    const res = await app.inject({
      method: 'GET', url: '/admin/games',
      headers: { authorization: `Bearer ${adminToken}`, cookie: adminCookieHeader },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    const g = body.find((g: { name: string }) => g.name === 'Named Owner Game')
    expect(g).toBeDefined()
    expect(g.ownerDisplayName).toBe('Named Owner')
    expect(g.ownerId).toBe(ownerId)
    await app.close()
  })

  it('filters games by ownerName query param (case-insensitive substring)', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')

    const aliceReg = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'alice@test.com', password: 'password123', displayName: 'Alice Keeper' },
    })
    const aliceCookie = (aliceReg.headers['set-cookie'] as string[] | string)
    const aliceCookieHeader = Array.isArray(aliceCookie) ? aliceCookie.join('; ') : (aliceCookie ?? '')

    const bobReg = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'bob@test.com', password: 'password123', displayName: 'Bob Runner' },
    })
    const bobCookie = (bobReg.headers['set-cookie'] as string[] | string)
    const bobCookieHeader = Array.isArray(bobCookie) ? bobCookie.join('; ') : (bobCookie ?? '')

    await app.inject({
      method: 'POST', url: '/games',
      headers: { cookie: aliceCookieHeader },
      payload: { name: 'Alice Game' },
    })
    await app.inject({
      method: 'POST', url: '/games',
      headers: { cookie: bobCookieHeader },
      payload: { name: 'Bob Game' },
    })

    const adminLoginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' },
    })
    const adminCookie = (adminLoginRes.headers['set-cookie'] as string[] | string)
    const adminCookieHeader = Array.isArray(adminCookie) ? adminCookie.join('; ') : (adminCookie ?? '')

    const res = await app.inject({
      method: 'GET', url: '/admin/games?ownerName=alice',
      headers: { authorization: `Bearer ${adminToken}`, cookie: adminCookieHeader },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.length).toBe(1)
    expect(body[0].name).toBe('Alice Game')
    expect(body[0].ownerDisplayName).toBe('Alice Keeper')
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
    expect(entry.userDisplayName).toBe('user')
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
    expect(u.displayName).toBe('user')
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

describe('PATCH /admin/users/:id/block — guards', () => {
  it('returns 409 when blocking an already-blocked user', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { userId: targetId } = await registerAndLogin(app, 'target@test.com')

    // Block once
    await app.inject({
      method: 'PATCH', url: `/admin/users/${targetId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    // Try to block again
    const res = await app.inject({
      method: 'PATCH', url: `/admin/users/${targetId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 400 when self-blocking', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken, userId: adminId } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'PATCH', url: `/admin/users/${adminId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('returns 400 when blocking a sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { userId: targetId } = await createSysAdmin(app, 'target-admin@test.com').then(r => ({ userId: r.userId }))

    const res = await app.inject({
      method: 'PATCH', url: `/admin/users/${targetId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('returns 404 when blocking a non-existent user', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/users/00000000-0000-0000-0000-000000000000/block',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('PATCH /admin/users/:id/unblock — guards', () => {
  it('returns 409 when unblocking a user who is not blocked', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { userId: targetId } = await registerAndLogin(app, 'target@test.com')

    const res = await app.inject({
      method: 'PATCH', url: `/admin/users/${targetId}/unblock`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 404 when unblocking a non-existent user', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/users/00000000-0000-0000-0000-000000000000/unblock',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('PATCH /admin/users/:id/block — cascade', () => {
  it('blocks user, deactivates their characters, and inactivates their owned game', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { userId: targetId } = await registerAndLogin(app, 'target@test.com')

    const targetLoginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'target@test.com', password: 'password123' },
    })
    const targetToken = extractToken(targetLoginRes.headers as Record<string, unknown>)

    const gameRes = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${targetToken}` },
      payload: { name: 'Target User Game' },
    })
    const gameId = gameRes.json().id as string

    await app.inject({
      method: 'PATCH', url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${targetToken}` },
      payload: { status: 'active' },
    })

    const [schema] = await testDb.insert(characterSchemas).values({
      id: randomUUID(),
      gameId,
      name: 'Test Schema',
      version: 1,
      fields: [],
      isActive: true,
      type: 'race',
    }).returning()

    await testDb.insert(characters).values({
      id: randomUUID(),
      gameId,
      userId: targetId,
      schemaId: schema.id,
      name: 'Target Char',
      data: {},
    })

    const blockRes = await app.inject({
      method: 'PATCH', url: `/admin/users/${targetId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(blockRes.statusCode).toBe(200)

    const [blockedUser] = await testDb.select({ isBlocked: users.isBlocked })
      .from(users).where(eq(users.id, targetId)).limit(1)
    expect(blockedUser.isBlocked).toBe(true)

    const [updatedGame] = await testDb.select({ status: game.status })
      .from(game).where(eq(game.id, gameId)).limit(1)
    expect(updatedGame.status).toBe('inactive')

    const [updatedChar] = await testDb.select({ isActive: characters.isActive })
      .from(characters).where(eq(characters.userId, targetId)).limit(1)
    expect(updatedChar.isActive).toBe(false)

    await app.close()
  })
})

describe('PATCH /admin/users/:id/unblock — cascade', () => {
  it('unblocks user, reactivates their characters, and reactivates their owned game', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { userId: targetId } = await registerAndLogin(app, 'target@test.com')

    const targetLoginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'target@test.com', password: 'password123' },
    })
    const targetToken = extractToken(targetLoginRes.headers as Record<string, unknown>)

    const gameRes = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${targetToken}` },
      payload: { name: 'Unblock Test Game' },
    })
    const gameId = gameRes.json().id as string

    await app.inject({
      method: 'PATCH', url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${targetToken}` },
      payload: { status: 'active' },
    })

    const [schema] = await testDb.insert(characterSchemas).values({
      id: randomUUID(),
      gameId,
      name: 'Test Schema',
      version: 1,
      fields: [],
      isActive: true,
      type: 'race',
    }).returning()

    await testDb.insert(characters).values({
      id: randomUUID(),
      gameId,
      userId: targetId,
      schemaId: schema.id,
      name: 'Target Char',
      data: {},
    })

    // Block first
    await app.inject({
      method: 'PATCH', url: `/admin/users/${targetId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    // Then unblock
    const unblockRes = await app.inject({
      method: 'PATCH', url: `/admin/users/${targetId}/unblock`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(unblockRes.statusCode).toBe(200)

    const [unblockedUser] = await testDb.select({ isBlocked: users.isBlocked })
      .from(users).where(eq(users.id, targetId)).limit(1)
    expect(unblockedUser.isBlocked).toBe(false)

    const [updatedGame] = await testDb.select({ status: game.status })
      .from(game).where(eq(game.id, gameId)).limit(1)
    expect(updatedGame.status).toBe('active')

    const [updatedChar] = await testDb.select({ isActive: characters.isActive })
      .from(characters).where(eq(characters.userId, targetId)).limit(1)
    expect(updatedChar.isActive).toBe(true)

    await app.close()
  })
})

describe('PATCH /admin/characters/:id/block and /unblock', () => {
  it('blocks a character and marks it blocked in the DB', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    const { userId: ownerId } = await registerAndLogin(app, 'owner@test.com')

    const ownerLoginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'owner@test.com', password: 'password123' },
    })
    const ownerToken = extractToken(ownerLoginRes.headers as Record<string, unknown>)

    const gameRes = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: 'Char Block Game' },
    })
    const gameId = gameRes.json().id as string

    const [schema] = await testDb.insert(characterSchemas).values({
      id: randomUUID(),
      gameId,
      name: 'Schema',
      version: 1,
      fields: [],
      isActive: true,
      type: 'race',
    }).returning()

    const [character] = await testDb.insert(characters).values({
      id: randomUUID(),
      gameId,
      userId: ownerId,
      schemaId: schema.id,
      name: 'Block Me',
      data: {},
    }).returning()

    const blockRes = await app.inject({
      method: 'PATCH', url: `/admin/characters/${character.id}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(blockRes.statusCode).toBe(200)

    const [blocked] = await testDb.select({ isBlocked: characters.isBlocked })
      .from(characters).where(eq(characters.id, character.id)).limit(1)
    expect(blocked.isBlocked).toBe(true)

    const unblockRes = await app.inject({
      method: 'PATCH', url: `/admin/characters/${character.id}/unblock`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(unblockRes.statusCode).toBe(200)

    const [unblocked] = await testDb.select({ isBlocked: characters.isBlocked })
      .from(characters).where(eq(characters.id, character.id)).limit(1)
    expect(unblocked.isBlocked).toBe(false)

    await app.close()
  })

  it('returns 404 for non-existent character', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/characters/00000000-0000-0000-0000-000000000000/block',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('returns 403 for non-sys_admin', async () => {
    const app = buildApp()
    await app.ready()

    const { token } = await registerAndLogin(app)

    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/characters/00000000-0000-0000-0000-000000000000/block',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('PATCH /admin/games/:id/block and /unblock', () => {
  it('blocks a game and makes it inaccessible to members', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app, 'admin@test.com')
    await registerAndLogin(app, 'gameowner@test.com')

    const ownerLoginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: 'gameowner@test.com', password: 'password123' },
    })
    const ownerToken = extractToken(ownerLoginRes.headers as Record<string, unknown>)

    const gameRes = await app.inject({
      method: 'POST', url: '/games',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: 'Game To Block' },
    })
    const gameId = gameRes.json().id as string

    // Activate game first so members can be in it
    await app.inject({
      method: 'PATCH', url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'active' },
    })

    const blockRes = await app.inject({
      method: 'PATCH', url: `/admin/games/${gameId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(blockRes.statusCode).toBe(200)

    // Owner can no longer access the game via game context routes
    const accessRes = await app.inject({
      method: 'GET', url: '/events',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })
    expect(accessRes.statusCode).toBe(403)

    const unblockRes = await app.inject({
      method: 'PATCH', url: `/admin/games/${gameId}/unblock`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(unblockRes.statusCode).toBe(200)

    await app.close()
  })

  it('returns 404 for non-existent game', async () => {
    const app = buildApp()
    await app.ready()

    const { token: adminToken } = await createSysAdmin(app)

    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/games/00000000-0000-0000-0000-000000000000/block',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})
