import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

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
    url: `/games/${gameId}/join`,
    headers: { authorization: `Bearer ${gmToken}` },
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
    url: `/games/${gameId}/join`,
    headers: { authorization: `Bearer ${playerToken}` },
  })

  return { app, ownerToken, gmToken, playerToken, gameId }
}

describe('POST /plots', () => {
  it('GM can create a plot', async () => {
    const { app, gmToken, gameId } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { title: 'The Dark Conspiracy', description: 'A shadow organization moves against the crown.' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.title).toBe('The Dark Conspiracy')
    expect(body.status).toBe('active')
    expect(body.linkedEventIds).toEqual([])
    await app.close()
  })

  it('player cannot create plots', async () => {
    const { app, playerToken, gameId } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { title: 'Forbidden Plot' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /plots', () => {
  it('GM can list plots', async () => {
    const { app, gmToken, gameId } = await setupOwnerAndGm()

    await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { title: 'Plot One' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })
})

describe('PATCH /plots/:id', () => {
  it('can update title and resolve a plot', async () => {
    const { app, gmToken, gameId } = await setupOwnerAndGm()

    const plot = (await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { title: 'Active Plot' },
    })).json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/plots/${plot.id}`,
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { status: 'resolved', title: 'Resolved Plot' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('resolved')
    expect(res.json().title).toBe('Resolved Plot')
    await app.close()
  })

  it('can link events to a plot', async () => {
    const { app, ownerToken, gmToken, gameId } = await setupOwnerAndGm()

    const eventRes = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { title: 'Linked Event', startAt: FUTURE_DATE },
    })
    const event = eventRes.json()

    const plot = (await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { title: 'My Plot' },
    })).json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/plots/${plot.id}`,
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { linkedEventIds: [event.id] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().linkedEventIds).toContain(event.id)
    await app.close()
  })
})

describe('DELETE /plots/:id', () => {
  it('GM can delete a plot', async () => {
    const { app, gmToken, gameId } = await setupOwnerAndGm()

    const plot = (await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
      payload: { title: 'To Delete' },
    })).json()

    const res = await app.inject({
      method: 'DELETE',
      url: `/plots/${plot.id}`,
      headers: { authorization: `Bearer ${gmToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(204)
    await app.close()
  })
})
