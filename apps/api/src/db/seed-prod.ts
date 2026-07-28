import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from './index.js'
import { users } from './schema.js'

const email = process.env.SYSADMIN_EMAIL ?? 'webdevmeg@gmail.com'
const password = process.env.SYSADMIN_PASSWORD
if (!password) throw new Error('SYSADMIN_PASSWORD env var is required')

const passwordHash = await bcrypt.hash(password, 12)

await db.insert(users).values({
  email,
  passwordHash,
  displayName: 'Admin',
  isSysAdmin: true,
}).onConflictDoUpdate({
  target: users.email,
  set: { isSysAdmin: true },
})

const [user] = await db.select().from(users).where(eq(users.email, email))
if (!user) throw new Error('Failed to find sysadmin user after upsert')
console.log(`Sysadmin ensured: ${user.email} (id: ${user.id})`)
process.exit(0)
