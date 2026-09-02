import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../index.js'
import { users } from '../schema.js'
import { cleanupExpiredGuests } from '../cleanup.js'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'

async function createGuestUser(expiresAt: Date) {
  const id = crypto.randomUUID()
  const [u] = await db.insert(users).values({
    id,
    email: `guest-${id}@guest.plotrunner.run`,
    passwordHash: crypto.randomBytes(32).toString('hex'),
    displayName: `Wanderer #${Math.floor(Math.random() * 9999)}`,
    isGuest: true,
    guestExpiresAt: expiresAt,
  }).returning()
  return u!
}

async function createRealUser() {
  const id = crypto.randomUUID()
  const [u] = await db.insert(users).values({
    id,
    email: `real-${id}@example.com`,
    passwordHash: crypto.randomBytes(32).toString('hex'),
    displayName: 'Real User',
    isGuest: false,
  }).returning()
  return u!
}

describe('cleanupExpiredGuests', () => {
  beforeEach(async () => {
    // Clean up any leftover guest rows from prior runs
    await db.delete(users).where(eq(users.isGuest, true))
  })

  it('deletes a guest whose expiry has passed', async () => {
    const expired = await createGuestUser(new Date(Date.now() - 1000))
    await cleanupExpiredGuests()
    const [found] = await db.select().from(users).where(eq(users.id, expired.id)).limit(1)
    expect(found).toBeUndefined()
  })

  it('does NOT delete a guest whose expiry is in the future', async () => {
    const active = await createGuestUser(new Date(Date.now() + 60_000))
    await cleanupExpiredGuests()
    const [found] = await db.select().from(users).where(eq(users.id, active.id)).limit(1)
    expect(found).toBeDefined()
    // cleanup
    await db.delete(users).where(eq(users.id, active.id))
  })

  it('does NOT delete non-guest users', async () => {
    const real = await createRealUser()
    await cleanupExpiredGuests()
    const [found] = await db.select().from(users).where(eq(users.id, real.id)).limit(1)
    expect(found).toBeDefined()
    // cleanup
    await db.delete(users).where(eq(users.id, real.id))
  })
})
