import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../src/db/schema.js'
import {
  users, game, gameMembers, siteConfig, characterSchemas, characters,
  xpTransactions, events, eventRegistrations, npcs, plots, schemaTemplates,
  storeItems, purchases, postLikes, comments, adventureSubscriptions, posts,
  requestLogs,
} from '../src/db/schema.js'

const testPool = new Pool({
  connectionString: process.env['TEST_DATABASE_URL'] ?? 'postgresql://larpdb:larpdb@localhost:5432/larpdb_test',
})

export const testDb = drizzle(testPool, { schema })

beforeAll(async () => {
  await migrate(testDb, { migrationsFolder: './drizzle' })
})

beforeEach(async () => {
  await testDb.delete(requestLogs)
  await testDb.delete(postLikes)
  await testDb.delete(comments)
  await testDb.delete(adventureSubscriptions)
  await testDb.delete(posts)
  await testDb.delete(purchases)
  await testDb.delete(xpTransactions)
  await testDb.delete(eventRegistrations)
  await testDb.delete(storeItems)
  await testDb.delete(characters)
  await testDb.delete(events)
  await testDb.delete(npcs)
  await testDb.delete(plots)
  await testDb.delete(characterSchemas)
  await testDb.delete(schemaTemplates)
  await testDb.delete(siteConfig)
  await testDb.delete(gameMembers)
  await testDb.delete(users)
  await testDb.delete(game)
})

afterAll(async () => {
  await testPool.end()
})
