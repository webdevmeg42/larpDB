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
