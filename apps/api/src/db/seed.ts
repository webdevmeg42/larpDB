import bcrypt from 'bcrypt'
import { db } from './index.js'
import { users, game, siteConfig, gameMembers } from './schema.js'

const existingGame = await db.select().from(game).limit(1)
if (existingGame.length > 0) {
  console.log('Database already seeded — skipping.')
  process.exit(0)
}

const passwordHash = await bcrypt.hash('password', 12)

const [newUser] = await db.insert(users).values({
  email: 'webdevmeg@gmail.com',
  passwordHash,
  displayName: 'Megan',
  isSysAdmin: true,
}).returning()

if (!newUser) throw new Error('Failed to create user')

const [newGame] = await db.insert(game).values({
  name: 'My Adventure',
  slug: 'my-adventure',
  isPublic: true,
  status: 'active',
}).returning()

if (!newGame) throw new Error('Failed to create game')

await db.insert(gameMembers).values({
  gameId: newGame.id,
  userId: newUser.id,
  role: 'owner',
  status: 'active',
})

await db.insert(siteConfig).values({
  gameId: newGame.id,
  siteTitle: 'My Adventure',
})

console.log(`Seeded: ${newUser.email} as owner of game ${newGame.id}`)
process.exit(0)
