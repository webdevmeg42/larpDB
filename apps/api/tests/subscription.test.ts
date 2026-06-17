import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

async function createAndLogin(email = 'owner@test.com') {
  const app = buildApp()
  await app.ready()

  const regRes = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email, password: 'password123', displayName: 'Owner' },
  })
  const { token } = regRes.json()

  const gameRes = await app.inject({
    method: 'POST', url: '/games',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Test Game' },
  })
  const gameBody = gameRes.json()

  await app.inject({
    method: 'PATCH', url: `/games/${gameBody.id}/status`,
    headers: { authorization: `Bearer ${token}` },
    payload: { status: 'active' },
  })

  return { app, token, gameId: gameBody.id }
}

describe('POST /subscriptions', () => {
  it('subscribes an authenticated user to a game', async () => {
    const { app, gameId } = await createAndLogin()

    const userRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'user@test.com', password: 'password123', displayName: 'User' },
    })
    const { token: userToken } = userRes.json()

    const res = await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { gameId },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().gameId).toBe(gameId)
    await app.close()
  })

  it('returns 409 if already subscribed', async () => {
    const { app, token, gameId } = await createAndLogin()

    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${token}` },
      payload: { gameId },
    })

    const res = await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${token}` },
      payload: { gameId },
    })
    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 404 for non-existent game', async () => {
    const { app, token } = await createAndLogin()
    const res = await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${token}` },
      payload: { gameId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('returns 401 without auth', async () => {
    const { app, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'POST', url: '/subscriptions',
      payload: { gameId },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('DELETE /subscriptions/:gameId', () => {
  it('unsubscribes an authenticated user', async () => {
    const { app, token, gameId } = await createAndLogin()

    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${token}` },
      payload: { gameId },
    })

    const res = await app.inject({
      method: 'DELETE', url: `/subscriptions/${gameId}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
    await app.close()
  })

  it('returns 404 if not subscribed', async () => {
    const { app, token, gameId } = await createAndLogin()
    const res = await app.inject({
      method: 'DELETE', url: `/subscriptions/${gameId}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('GET /subscriptions', () => {
  it('returns list of subscriptions for authenticated user', async () => {
    const { app, token, gameId } = await createAndLogin()

    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${token}` },
      payload: { gameId },
    })

    const res = await app.inject({
      method: 'GET', url: '/subscriptions',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(1)
    expect(body[0].gameId).toBe(gameId)
    await app.close()
  })

  it('returns empty list when not subscribed to anything', async () => {
    const { app, token } = await createAndLogin()
    const res = await app.inject({
      method: 'GET', url: '/subscriptions',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(0)
    await app.close()
  })
})

describe('auto-subscribe on join (open mode)', () => {
  it('subscribes user automatically when joining an open LARP', async () => {
    const { app, gameId } = await createAndLogin()

    const userRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'joiner@test.com', password: 'password123', displayName: 'Joiner' },
    })
    const { token: joinerToken } = userRes.json()

    await app.inject({
      method: 'POST', url: `/games/${gameId}/join`,
      headers: { authorization: `Bearer ${joinerToken}` },
    })

    const res = await app.inject({
      method: 'GET', url: '/subscriptions',
      headers: { authorization: `Bearer ${joinerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    expect(res.json()[0].gameId).toBe(gameId)
    await app.close()
  })

  it('does not create a duplicate subscription if already subscribed when joining', async () => {
    const { app, gameId } = await createAndLogin()

    const userRes = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: 'joiner2@test.com', password: 'password123', displayName: 'Joiner2' },
    })
    const { token: joinerToken } = userRes.json()

    // Subscribe first, then join
    await app.inject({
      method: 'POST', url: '/subscriptions',
      headers: { authorization: `Bearer ${joinerToken}` },
      payload: { gameId },
    })
    await app.inject({
      method: 'POST', url: `/games/${gameId}/join`,
      headers: { authorization: `Bearer ${joinerToken}` },
    })

    const res = await app.inject({
      method: 'GET', url: '/subscriptions',
      headers: { authorization: `Bearer ${joinerToken}` },
    })
    expect(res.json()).toHaveLength(1)
    await app.close()
  })
})
