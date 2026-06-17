import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

const SIMPLE_FIELDS = [
  { id: '11111111-1111-1111-1111-111111111111', label: 'Class', type: 'text' as const, required: true, order: 0 },
  { id: '22222222-2222-2222-2222-222222222222', label: 'Level', type: 'number' as const, required: false, order: 1, min: 1, max: 20 },
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

  await app.inject({
    method: 'PATCH',
    url: `/games/${gameId}/status`,
    headers: { authorization: `Bearer ${token}` },
    payload: { status: 'active' },
  })

  return { app, token, gameId }
}

async function setupWithActiveSchema() {
  const { app, token: ownerToken, gameId } = await createAndLogin()

  const schemaRes = await app.inject({
    method: 'POST',
    url: '/character-schemas',
    headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
  })
  const schema = schemaRes.json()

  await app.inject({
    method: 'POST',
    url: `/character-schemas/${schema.id}/activate`,
    headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
  })

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

  return { app, ownerToken, playerToken, schema, gameId }
}

describe('POST /characters', () => {
  it('creates a character with valid data', async () => {
    const { app, playerToken, gameId } = await setupWithActiveSchema()

    const res = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {
        name: 'Elara',
        data: {
          '11111111-1111-1111-1111-111111111111': 'Ranger',
          '22222222-2222-2222-2222-222222222222': 5,
        },
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Elara')
    expect(body.totalXp).toBe(0)
    await app.close()
  })

  it('returns 400 when required field is missing', async () => {
    const { app, playerToken, gameId } = await setupWithActiveSchema()

    const res = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Elara', data: {} },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().errors).toBeDefined()
    await app.close()
  })

  it('returns 400 when number field is out of range', async () => {
    const { app, playerToken, gameId } = await setupWithActiveSchema()

    const res = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {
        name: 'Elara',
        data: {
          '11111111-1111-1111-1111-111111111111': 'Ranger',
          '22222222-2222-2222-2222-222222222222': 99,
        },
      },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('returns 404 when no active schema exists', async () => {
    const { app, token: ownerToken, gameId } = await createAndLogin('owner2@test.com')

    const playerRegRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'player2@test.com', password: 'password123', displayName: 'Player' },
    })
    const { token: playerToken } = playerRegRes.json()

    await app.inject({
      method: 'POST',
      url: `/games/${gameId}/join`,
      headers: { authorization: `Bearer ${playerToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'NoSchema', data: {} },
    })

    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('returns 403 for every role when the LARP is inactive', async () => {
    const { app, ownerToken, playerToken, gameId } = await setupWithActiveSchema()

    const gmRegRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'gm-postblock@test.com', password: 'password123', displayName: 'GM' },
    })
    const { token: gmToken, user: gmUser } = gmRegRes.json()
    await app.inject({
      method: 'POST',
      url: `/games/${gameId}/join`,
      headers: { authorization: `Bearer ${gmToken}` },
    })
    await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/members/${gmUser.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { role: 'gm' },
    })

    await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'inactive' },
    })

    for (const token of [ownerToken, gmToken, playerToken]) {
      const res = await app.inject({
        method: 'POST',
        url: '/characters',
        headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
        payload: {
          name: 'Blocked',
          data: { '11111111-1111-1111-1111-111111111111': 'Ranger' },
        },
      })
      expect(res.statusCode).toBe(403)
      expect(res.json().error).toBe('LARP is not currently active')
    }

    await app.close()
  })
})

describe('GET /characters', () => {
  it('player sees only their own characters', async () => {
    const { app, playerToken, gameId } = await setupWithActiveSchema()

    await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'My Char', data: { '11111111-1111-1111-1111-111111111111': 'Ranger' } },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.length).toBe(1)
    expect(body[0].name).toBe('My Char')
    await app.close()
  })

  it('owner sees all characters', async () => {
    const { app, ownerToken, playerToken, gameId } = await setupWithActiveSchema()

    await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Player Char', data: { '11111111-1111-1111-1111-111111111111': 'Ranger' } },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/characters',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })
})

describe('PATCH /characters/:id', () => {
  it('player can update their own character', async () => {
    const { app, playerToken, gameId } = await setupWithActiveSchema()

    const createRes = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Elara', data: { '11111111-1111-1111-1111-111111111111': 'Ranger' } },
    })
    const char = createRes.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/characters/${char.id}`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Elara the Bold' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Elara the Bold')
    await app.close()
  })

  it("player cannot update another player's character", async () => {
    const { app, playerToken, gameId } = await setupWithActiveSchema()

    const createRes = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Elara', data: { '11111111-1111-1111-1111-111111111111': 'Ranger' } },
    })
    const char = createRes.json()

    const player2RegRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'player2@test.com', password: 'password123', displayName: 'Player Two' },
    })
    const { token: otherToken } = player2RegRes.json()

    await app.inject({
      method: 'POST',
      url: `/games/${gameId}/join`,
      headers: { authorization: `Bearer ${otherToken}` },
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/characters/${char.id}`,
      headers: { authorization: `Bearer ${otherToken}`, 'x-game-id': gameId },
      payload: { name: 'Hacked' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('blocks a player from editing their own character while the LARP is inactive', async () => {
    const { app, ownerToken, playerToken, gameId } = await setupWithActiveSchema()

    const createRes = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Elara', data: { '11111111-1111-1111-1111-111111111111': 'Ranger' } },
    })
    const char = createRes.json()

    await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'inactive' },
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/characters/${char.id}`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Should Not Update' },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Character editing is disabled while this LARP is inactive')
    await app.close()
  })

  it('allows gm and owner to edit characters while the LARP is inactive', async () => {
    const { app, ownerToken, playerToken, gameId } = await setupWithActiveSchema()

    const createRes = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Elara', data: { '11111111-1111-1111-1111-111111111111': 'Ranger' } },
    })
    const char = createRes.json()

    const gmRegRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'gm-patch@test.com', password: 'password123', displayName: 'GM' },
    })
    const { token: gmToken, user: gmUser } = gmRegRes.json()
    await app.inject({
      method: 'POST',
      url: `/games/${gameId}/join`,
      headers: { authorization: `Bearer ${gmToken}` },
    })
    await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/members/${gmUser.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { role: 'gm' },
    })

    await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'inactive' },
    })

    const gmRes = await app.inject({
      method: 'PATCH',
      url: `/characters/${char.id}`,
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { name: 'GM Edited' },
    })
    expect(gmRes.statusCode).toBe(200)
    expect(gmRes.json().name).toBe('GM Edited')

    const ownerRes = await app.inject({
      method: 'PATCH',
      url: `/characters/${char.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { name: 'Owner Edited' },
    })
    expect(ownerRes.statusCode).toBe(200)
    expect(ownerRes.json().name).toBe('Owner Edited')

    await app.close()
  })

  it('allows GET /characters and GET /characters/:id regardless of LARP status', async () => {
    const { app, ownerToken, playerToken, gameId } = await setupWithActiveSchema()

    const createRes = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'Elara', data: { '11111111-1111-1111-1111-111111111111': 'Ranger' } },
    })
    const char = createRes.json()

    await app.inject({
      method: 'PATCH',
      url: `/games/${gameId}/status`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'inactive' },
    })

    const listRes = await app.inject({
      method: 'GET',
      url: '/characters',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    })
    expect(listRes.statusCode).toBe(200)
    expect(listRes.json().length).toBe(1)

    const detailRes = await app.inject({
      method: 'GET',
      url: `/characters/${char.id}`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    })
    expect(detailRes.statusCode).toBe(200)
    expect(detailRes.json().name).toBe('Elara')

    await app.close()
  })
})
