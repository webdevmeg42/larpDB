import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

const SIMPLE_FIELDS = [
  { id: '11111111-1111-1111-1111-111111111111', label: 'Class', type: 'text' as const, required: true, order: 0 },
]

async function setupWithCharacter() {
  const app = buildApp()
  await app.ready()

  const setupRes = await app.inject({
    method: 'POST',
    url: '/auth/setup',
    payload: { email: 'owner@test.com', password: 'password123', displayName: 'Owner', gameName: 'Test Game' },
  })
  const { token: ownerToken } = setupRes.json()

  const schemaRes = await app.inject({
    method: 'POST',
    url: '/character-schemas',
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
  })
  await app.inject({
    method: 'POST',
    url: `/character-schemas/${schemaRes.json().id}/activate`,
    headers: { authorization: `Bearer ${ownerToken}` },
  })

  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'player@test.com', password: 'password123', displayName: 'Player One' },
  })
  const loginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'player@test.com', password: 'password123' },
  })
  const { token: playerToken } = loginRes.json()

  const charRes = await app.inject({
    method: 'POST',
    url: '/characters',
    headers: { authorization: `Bearer ${playerToken}` },
    payload: { name: 'Elara', data: { '11111111-1111-1111-1111-111111111111': 'Ranger' } },
  })
  const character = charRes.json()

  return { app, ownerToken, playerToken, character }
}

describe('POST /characters/:id/xp/award', () => {
  it('owner awards XP to a character', async () => {
    const { app, ownerToken, character } = await setupWithCharacter()

    const res = await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/award`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { amount: 100, reason: 'Session 1 completion' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.amount).toBe(100)
    expect(body.type).toBe('award')
    await app.close()
  })

  it('updates the character total_xp', async () => {
    const { app, ownerToken, character } = await setupWithCharacter()

    await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/award`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { amount: 100, reason: 'Session 1' },
    })

    const charRes = await app.inject({
      method: 'GET',
      url: `/characters/${character.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })
    expect(charRes.json().totalXp).toBe(100)
    await app.close()
  })

  it('returns 403 when player tries to award XP', async () => {
    const { app, playerToken, character } = await setupWithCharacter()

    const res = await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/award`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { amount: 100, reason: 'Self-award' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('POST /characters/:id/xp/spend', () => {
  it('player spends XP from their character', async () => {
    const { app, ownerToken, playerToken, character } = await setupWithCharacter()

    await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/award`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { amount: 100, reason: 'Starting XP' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/spend`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { amount: 30, reason: 'Bought sword skill' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().type).toBe('spend')
    await app.close()
  })

  it('returns 400 when player has insufficient XP', async () => {
    const { app, playerToken, character } = await setupWithCharacter()

    const res = await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/spend`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { amount: 50, reason: 'Too expensive' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/insufficient/i)
    await app.close()
  })

  it("returns 403 when player tries to spend XP for another player's character", async () => {
    const { app, ownerToken, character } = await setupWithCharacter()

    await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/award`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { amount: 100, reason: 'Starting XP' },
    })

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'player2@test.com', password: 'password123', displayName: 'Player Two' },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'player2@test.com', password: 'password123' },
    })
    const { token: otherToken } = loginRes.json()

    const res = await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/spend`,
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { amount: 10, reason: 'Stealing XP' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /characters/:id/xp', () => {
  it('returns balance and transaction history', async () => {
    const { app, ownerToken, playerToken, character } = await setupWithCharacter()

    await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/award`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { amount: 100, reason: 'Session 1' },
    })
    await app.inject({
      method: 'POST',
      url: `/characters/${character.id}/xp/spend`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { amount: 25, reason: 'Skill purchase' },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/characters/${character.id}/xp`,
      headers: { authorization: `Bearer ${playerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.balance).toBe(75)
    expect(body.transactions.length).toBe(2)
    await app.close()
  })
})
