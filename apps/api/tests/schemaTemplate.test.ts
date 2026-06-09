import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'
import { testDb } from './setup.js'
import { schemaTemplates } from '../src/db/schema.js'

async function createAndLogin(email = 'owner@test.com') {
  const app = buildApp()
  await app.ready()

  const regRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'password123', displayName: 'Owner' },
  })
  const { token } = regRes.json()

  const gameRes = await app.inject({
    method: 'POST',
    url: '/games',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Test Game' },
  })
  const { id: gameId } = gameRes.json()

  return { app, token, gameId }
}

describe('GET /schema-templates', () => {
  it('returns seeded templates for the current game', async () => {
    await testDb.insert(schemaTemplates).values({
      name: 'Fantasy Adventure',
      genre: 'Fantasy',
      description: 'Test template',
      fields: [{ id: '11111111-0001-0001-0001-000000000001', label: 'Class', type: 'text', required: true, order: 0 }],
      isBuiltin: true,
    })

    const { app, token, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'GET',
      url: '/schema-templates',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(1)
    expect(body[0].name).toBe('Fantasy Adventure')
    await app.close()
  })
})
