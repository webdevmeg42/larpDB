import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

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

async function setupOwnerAndGm() {
  const { app, token: ownerToken, gameId } = await createAndLogin()

  const gmRegRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'gm@test.com', password: 'password123', displayName: 'GM User' },
  })
  const { token: gmToken, user: gmUser } = gmRegRes.json()

  await app.inject({
    method: 'POST',
    url: '/subscriptions',
    headers: { authorization: `Bearer ${gmToken}` },
    payload: { gameId },
  })

  await app.inject({
    method: 'PATCH',
    url: `/games/${gameId}/members/${gmUser.id}`,
    headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    payload: { role: 'gm' },
  })

  const playerRegRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'player@test.com', password: 'password123', displayName: 'Player' },
  })
  const { token: playerToken } = playerRegRes.json()

  await app.inject({
    method: 'POST',
    url: '/subscriptions',
    headers: { authorization: `Bearer ${playerToken}` },
    payload: { gameId },
  })

  return { app, ownerToken, gmToken, playerToken, gameId }
}

describe('POST /npcs', () => {
  it('GM can create an NPC', async () => {
    const { app, gmToken, gameId } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { name: 'Lord Blackwood', description: 'The villain', notes: 'Secret: he is the king' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().name).toBe('Lord Blackwood')
    await app.close()
  })

  it('player cannot create NPCs', async () => {
    const { app, playerToken, gameId } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { name: 'My NPC' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /npcs', () => {
  it('GM can list NPCs', async () => {
    const { app, gmToken, gameId } = await setupOwnerAndGm()

    await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { name: 'NPC One' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })

  it('player cannot list NPCs', async () => {
    const { app, playerToken, gameId } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'GET',
      url: '/npcs',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('PATCH /npcs/:id', () => {
  it('GM can update an NPC', async () => {
    const { app, gmToken, gameId } = await setupOwnerAndGm()

    const npc = (await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { name: 'Old Name' },
    })).json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/npcs/${npc.id}`,
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { name: 'New Name', notes: 'Updated notes' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('New Name')
    await app.close()
  })
})

describe('DELETE /npcs/:id', () => {
  it('owner can delete an NPC', async () => {
    const { app, ownerToken, gmToken, gameId } = await setupOwnerAndGm()

    const npc = (await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { name: 'To Delete' },
    })).json()

    const res = await app.inject({
      method: 'DELETE',
      url: `/npcs/${npc.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(204)
    await app.close()
  })
})

describe('GET /my-npcs', () => {
  it('owner sees all their games with NPCs', async () => {
    const { app, ownerToken, gmToken, gameId } = await setupOwnerAndGm()

    await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { name: 'Dark Lord', description: 'Main villain' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/my-npcs',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const { games } = res.json() as { games: { id: string; name: string; isActive: boolean; npcs: { id: string; name: string; description: string | null }[] }[] }
    expect(games).toHaveLength(1)
    expect(games[0]!.npcs).toHaveLength(1)
    expect(games[0]!.npcs[0]!.name).toBe('Dark Lord')
    expect(games[0]!.npcs[0]!.description).toBe('Main villain')
    await app.close()
  })

  it('GM sees their games with NPCs', async () => {
    const { app, gmToken, gameId } = await setupOwnerAndGm()

    await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { name: 'Side Villain' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/my-npcs',
      headers: { authorization: `Bearer ${gmToken}` },
    })

    expect(res.statusCode).toBe(200)
    const { games } = res.json() as { games: { npcs: { name: string }[] }[] }
    expect(games).toHaveLength(1)
    expect(games[0]!.npcs).toHaveLength(1)
    expect(games[0]!.npcs[0]!.name).toBe('Side Villain')
    await app.close()
  })

  it('player gets an empty games list', async () => {
    const { app, playerToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'GET',
      url: '/my-npcs',
      headers: { authorization: `Bearer ${playerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect((res.json() as { games: unknown[] }).games).toHaveLength(0)
    await app.close()
  })

  it('returns 401 when not authenticated', async () => {
    const { app } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'GET',
      url: '/my-npcs',
    })

    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('game with zero NPCs still appears with empty npcs array', async () => {
    const { app, ownerToken } = await setupOwnerAndGm()

    // Don't create any NPCs — game should appear with npcs: []
    const res = await app.inject({
      method: 'GET',
      url: '/my-npcs',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const { games } = res.json() as { games: { id: string; npcs: unknown[] }[] }
    expect(games).toHaveLength(1)
    expect(games[0]!.npcs).toHaveLength(0)
    await app.close()
  })
})
