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

async function seedTemplates() {
  await testDb.insert(schemaTemplates).values([
    {
      name: 'Fantasy Adventure',
      genre: 'Fantasy',
      description: 'Race template',
      fields: [{ id: '11111111-0001-0001-0001-000000000001', label: 'Appearance', type: 'text', required: false, order: 0 }],
      isBuiltin: true,
      type: 'race',
    },
    {
      name: 'Warrior',
      genre: 'Fantasy',
      description: 'Class template',
      fields: [{ id: 'aa000001-aa01-aa01-aa01-000000000001', label: 'Level', type: 'number', required: true, order: 0, min: 1, max: 20 }],
      isBuiltin: true,
      type: 'class',
    },
  ])
}

describe('GET /schema-templates', () => {
  it('returns all templates when no type param is given', async () => {
    await seedTemplates()
    const { app, token, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'GET',
      url: '/schema-templates',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(2)
    await app.close()
  })

  it('returns only race templates when ?type=race', async () => {
    await seedTemplates()
    const { app, token, gameId } = await createAndLogin('owner2@test.com')
    const res = await app.inject({
      method: 'GET',
      url: '/schema-templates?type=race',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Fantasy Adventure')
    await app.close()
  })

  it('returns only class templates when ?type=class', async () => {
    await seedTemplates()
    const { app, token, gameId } = await createAndLogin('owner3@test.com')
    const res = await app.inject({
      method: 'GET',
      url: '/schema-templates?type=class',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Warrior')
    await app.close()
  })
})
