import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

const SIMPLE_FIELDS = [
  { id: '11111111-1111-1111-1111-111111111111', label: 'Name', type: 'text' as const, required: true, order: 0 },
]

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

describe('POST /character-schemas', () => {
  it('creates a schema (owner only)', async () => {
    const { app, token, gameId } = await createAndLogin()

    const res = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS, type: 'race' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Hero Sheet')
    expect(body.type).toBe('race')
    expect(body.version).toBe(1)
    expect(body.isActive).toBe(false)
    await app.close()
  })

  it('creates a schema with type class', async () => {
    const { app, token, gameId } = await createAndLogin('classowner@test.com')

    const res = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { name: 'Class Sheet', fields: SIMPLE_FIELDS, type: 'class' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.type).toBe('class')
    await app.close()
  })

  it('returns 403 for non-owner', async () => {
    const { app, gameId } = await createAndLogin()

    // Register a second user (player) and have them join the game
    const playerRegRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'player@test.com', password: 'password123', displayName: 'Player One' },
    })
    const { token: playerToken } = playerRegRes.json()

    await app.inject({
      method: 'POST',
      url: `/games/${gameId}/join`,
      headers: { authorization: `Bearer ${playerToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS, type: 'race' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 401 without token', async () => {
    const { app, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { 'x-game-id': gameId },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS, type: 'race' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('GET /character-schemas', () => {
  it('returns schemas filtered to game', async () => {
    const { app, token, gameId } = await createAndLogin()

    await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS, type: 'race' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(1)
    await app.close()
  })
})

describe('PATCH /character-schemas/:id', () => {
  it('creates a new version of the schema', async () => {
    const { app, token, gameId } = await createAndLogin()

    const createRes = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS, type: 'race' },
    })
    const original = createRes.json()

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/character-schemas/${original.id}`,
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { name: 'Hero Sheet v2' },
    })

    expect(patchRes.statusCode).toBe(201)
    const newVersion = patchRes.json()
    expect(newVersion.name).toBe('Hero Sheet v2')
    expect(newVersion.version).toBe(2)
    expect(newVersion.id).not.toBe(original.id)
    expect(newVersion.type).toBe(original.type)
    await app.close()
  })
})

describe('POST /character-schemas/:id/activate', () => {
  it('activates a schema and deactivates others', async () => {
    const { app, token, gameId } = await createAndLogin()

    const r1 = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { name: 'Schema A', fields: SIMPLE_FIELDS, type: 'race' },
    })
    const r2 = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
      payload: { name: 'Schema B', fields: SIMPLE_FIELDS, type: 'race' },
    })

    const activateRes = await app.inject({
      method: 'POST',
      url: `/character-schemas/${r1.json().id}/activate`,
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })

    expect(activateRes.statusCode).toBe(200)
    expect(activateRes.json().isActive).toBe(true)

    const r2Get = await app.inject({
      method: 'GET',
      url: `/character-schemas/${r2.json().id}`,
      headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
    })
    expect(r2Get.json().isActive).toBe(false)

    await app.close()
  })
})
