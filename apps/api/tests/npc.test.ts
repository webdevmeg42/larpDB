import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

async function setupOwnerAndGm() {
  const app = buildApp()
  await app.ready()

  const ownerRes = await app.inject({
    method: 'POST',
    url: '/auth/setup',
    payload: { email: 'owner@test.com', password: 'password123', displayName: 'Owner', gameName: 'Test Game' },
  })
  const { token: ownerToken } = ownerRes.json()

  const gmRegRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'gm@test.com', password: 'password123', displayName: 'GM User' },
  })
  await app.inject({
    method: 'PATCH',
    url: `/users/${gmRegRes.json().user.id}/role`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { role: 'gm' },
  })
  const gmLoginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'gm@test.com', password: 'password123' },
  })
  const { token: gmToken } = gmLoginRes.json()

  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'player@test.com', password: 'password123', displayName: 'Player' },
  })
  const playerLoginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'player@test.com', password: 'password123' },
  })
  const { token: playerToken } = playerLoginRes.json()

  return { app, ownerToken, gmToken, playerToken }
}

describe('POST /npcs', () => {
  it('GM can create an NPC', async () => {
    const { app, gmToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { name: 'Lord Blackwood', description: 'The villain', notes: 'Secret: he is the king' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().name).toBe('Lord Blackwood')
    await app.close()
  })

  it('player cannot create NPCs', async () => {
    const { app, playerToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { name: 'My NPC' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /npcs', () => {
  it('GM can list NPCs', async () => {
    const { app, gmToken } = await setupOwnerAndGm()

    await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { name: 'NPC One' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })

  it('player cannot list NPCs', async () => {
    const { app, playerToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'GET',
      url: '/npcs',
      headers: { authorization: `Bearer ${playerToken}` },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('PATCH /npcs/:id', () => {
  it('GM can update an NPC', async () => {
    const { app, gmToken } = await setupOwnerAndGm()

    const npc = (await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { name: 'Old Name' },
    })).json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/npcs/${npc.id}`,
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { name: 'New Name', notes: 'Updated notes' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('New Name')
    await app.close()
  })
})

describe('DELETE /npcs/:id', () => {
  it('owner can delete an NPC', async () => {
    const { app, ownerToken, gmToken } = await setupOwnerAndGm()

    const npc = (await app.inject({
      method: 'POST',
      url: '/npcs',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { name: 'To Delete' },
    })).json()

    const res = await app.inject({
      method: 'DELETE',
      url: `/npcs/${npc.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(204)
    await app.close()
  })
})
