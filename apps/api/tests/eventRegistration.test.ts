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

async function setupWithPublishedEvent() {
  const { app, token: ownerToken, gameId } = await createAndLogin()

  const eventRes = await app.inject({
    method: 'POST',
    url: '/events',
    headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    payload: { title: 'Session One', startAt: FUTURE_DATE, maxPlayers: 2 },
  })
  const event = eventRes.json()

  await app.inject({
    method: 'POST',
    url: `/events/${event.id}/publish`,
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
    url: '/subscriptions',
    headers: { authorization: `Bearer ${playerToken}` },
    payload: { gameId },
  })

  return { app, ownerToken, playerToken, event, gameId }
}

describe('POST /events/:id/register', () => {
  it('player registers for a published event', async () => {
    const { app, playerToken, event, gameId } = await setupWithPublishedEvent()

    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.eventId).toBe(event.id)
    expect(body.status).toBe('pending')
    await app.close()
  })

  it('returns 409 when player registers twice', async () => {
    const { app, playerToken, event, gameId } = await setupWithPublishedEvent()

    await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })

    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('auto-waitlists when event is at confirmed capacity', async () => {
    const { app, ownerToken, playerToken, event, gameId } = await setupWithPublishedEvent()

    // Fill capacity with confirmed registrations using 2 other players
    for (const email of ['p2@test.com', 'p3@test.com']) {
      const regRes = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email, password: 'password123', displayName: email },
      })
      const { token } = regRes.json()

      await app.inject({
        method: 'POST',
        url: '/subscriptions',
        headers: { authorization: `Bearer ${token}` },
        payload: { gameId },
      })

      const eventRegRes = await app.inject({
        method: 'POST',
        url: `/events/${event.id}/register`,
        headers: { authorization: `Bearer ${token}`, 'x-game-id': gameId },
        payload: {},
      })
      // Confirm each registration
      await app.inject({
        method: 'PATCH',
        url: `/events/${event.id}/registrations/${eventRegRes.json().id}`,
        headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
        payload: { status: 'confirmed' },
      })
    }

    // Now player registers — should be waitlisted
    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().status).toBe('waitlist')
    await app.close()
  })

  it('returns 400 for draft events', async () => {
    const { app, token: ownerToken, gameId } = await createAndLogin('owner2@test.com')

    const draftEvent = (await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { title: 'Draft Event', startAt: FUTURE_DATE },
    })).json()

    const playerRegRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'player2@test.com', password: 'password123', displayName: 'Player' },
    })
    const { token: playerToken } = playerRegRes.json()

    await app.inject({
      method: 'POST',
      url: '/subscriptions',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { gameId },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/events/${draftEvent.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('GET /events/:id/registrations', () => {
  it('owner sees all registrations', async () => {
    const { app, ownerToken, playerToken, event, gameId } = await setupWithPublishedEvent()

    await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })

    const res = await app.inject({
      method: 'GET',
      url: `/events/${event.id}/registrations`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })

  it('player sees only their own registrations', async () => {
    const { app, playerToken, event, gameId } = await setupWithPublishedEvent()

    await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })

    const res = await app.inject({
      method: 'GET',
      url: `/events/${event.id}/registrations`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })
})

describe('PATCH /events/:id/registrations/:regId', () => {
  it('owner can confirm a registration', async () => {
    const { app, ownerToken, playerToken, event, gameId } = await setupWithPublishedEvent()

    const regRes = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })
    const reg = regRes.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${event.id}/registrations/${reg.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { status: 'confirmed' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('confirmed')
    await app.close()
  })

  it('player can cancel their own registration', async () => {
    const { app, playerToken, event, gameId } = await setupWithPublishedEvent()

    const regRes = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })
    const reg = regRes.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${event.id}/registrations/${reg.id}`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { status: 'cancelled' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('cancelled')
    await app.close()
  })

  it('player cannot confirm their own registration', async () => {
    const { app, playerToken, event, gameId } = await setupWithPublishedEvent()

    const regRes = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: {},
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${event.id}/registrations/${regRes.json().id}`,
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { status: 'confirmed' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})
