import { describe, it, expect, afterEach } from 'vitest'
import { buildApp } from '../../app.js'
import { db } from '../../db/index.js'
import { users, game, gameMembers, characters, events } from '../../db/schema.js'
import { eq, and } from 'drizzle-orm'

const app = buildApp()
await app.ready()

describe('POST /auth/guest', () => {
  const createdUserIds: string[] = []

  afterEach(async () => {
    for (const id of createdUserIds) {
      // Find games owned by this guest user
      const owned = await db
        .select({ gameId: gameMembers.gameId })
        .from(gameMembers)
        .where(and(eq(gameMembers.userId, id), eq(gameMembers.role, 'owner')))
      const gameIds = owned.map((r) => r.gameId)

      // Mark guest as expired so cleanupExpiredGuests will pick it up
      if (gameIds.length > 0) {
        await db.update(users).set({ guestExpiresAt: new Date(0) }).where(eq(users.id, id))
      }
    }
    if (createdUserIds.length > 0) {
      const { cleanupExpiredGuests } = await import('../../db/cleanup.js')
      await cleanupExpiredGuests()
    }
    createdUserIds.length = 0
  })

  it('returns 200 with a gameId and sets a token cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/guest' })
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.gameId).toBeTruthy()
    expect(typeof body.gameId).toBe('string')

    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeTruthy()
    expect(String(setCookie)).toContain('token=')

    // Track for cleanup — find the user via game_members
    const [member] = await db
      .select({ userId: gameMembers.userId })
      .from(gameMembers)
      .where(eq(gameMembers.gameId, body.gameId))
      .limit(1)
    if (member) createdUserIds.push(member.userId)
  })

  it('creates a user with isGuest=true and guestExpiresAt in the future', async () => {
    const before = new Date()
    const res = await app.inject({ method: 'POST', url: '/auth/guest' })
    const { gameId } = JSON.parse(res.body)

    const [member] = await db
      .select({ userId: gameMembers.userId })
      .from(gameMembers)
      .where(eq(gameMembers.gameId, gameId))
      .limit(1)
    expect(member).toBeDefined()
    const userId = member!.userId
    createdUserIds.push(userId)

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    expect(user).toBeDefined()
    expect(user!.isGuest).toBe(true)
    expect(user!.guestExpiresAt).toBeDefined()
    expect(user!.guestExpiresAt!.getTime()).toBeGreaterThan(before.getTime())
  })

  it('seeds demo characters and events', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/guest' })
    const { gameId } = JSON.parse(res.body)

    const [member] = await db
      .select({ userId: gameMembers.userId })
      .from(gameMembers)
      .where(eq(gameMembers.gameId, gameId))
      .limit(1)
    createdUserIds.push(member!.userId)

    const chars = await db.select().from(characters).where(eq(characters.gameId, gameId))
    expect(chars.length).toBe(3)

    const evts = await db.select().from(events).where(eq(events.gameId, gameId))
    expect(evts.length).toBe(3)
  })
})
