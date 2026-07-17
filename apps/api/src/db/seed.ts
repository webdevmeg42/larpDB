import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from './index.js'
import { users, game, siteConfig, gameMembers } from './schema.js'

const passwordHash = await bcrypt.hash('password', 12)

// Upsert owner
await db.insert(users).values({
  email: 'webdevmeg@gmail.com',
  passwordHash,
  displayName: 'Megan',
  isSysAdmin: true,
}).onConflictDoNothing()

const [owner] = await db.select().from(users).where(eq(users.email, 'webdevmeg@gmail.com'))
if (!owner) throw new Error('Failed to find/create owner')

// Upsert test player (used by Cypress playerFlow tests)
// Use onConflictDoUpdate to reset the password to the seeded value,
// in case the account was previously created via the UI with a different password.
await db.insert(users).values({
  email: 'webdevmeg+testuser1@gmail.com',
  passwordHash,
  displayName: 'Test Player',
}).onConflictDoUpdate({
  target: users.email,
  set: { passwordHash },
})

const [player] = await db.select().from(users).where(eq(users.email, 'webdevmeg+testuser1@gmail.com'))
if (!player) throw new Error('Failed to find/create player')

// Upsert game
await db.insert(game).values({
  name: 'My Adventure',
  slug: 'my-adventure',
  isPublic: true,
  status: 'active',
}).onConflictDoNothing()

const [testGame] = await db.select().from(game).where(eq(game.slug, 'my-adventure'))
if (!testGame) throw new Error('Failed to find/create game')

// Upsert memberships
await db.insert(gameMembers).values([
  { gameId: testGame.id, userId: owner.id, role: 'owner', status: 'active' },
  { gameId: testGame.id, userId: player.id, role: 'player', status: 'active' },
]).onConflictDoNothing()

// Upsert site config (no unique constraint on gameId, so check first)
const [existingConfig] = await db.select().from(siteConfig).where(eq(siteConfig.gameId, testGame.id)).limit(1)
if (!existingConfig) {
  await db.insert(siteConfig).values({
    gameId: testGame.id,
    siteTitle: 'My Adventure',
  })
}

console.log(`Seeded: ${owner.email} as owner, ${player.email} as player of game ${testGame.id}`)
process.exit(0)
