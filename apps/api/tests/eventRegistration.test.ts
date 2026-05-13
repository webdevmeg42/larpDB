import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

async function setupWithPublishedEvent() {
  const app = buildApp()
  await app.ready()

  const ownerRes = await app.inject({
    method: 'POST',
    url: '/auth/setup',
    payload: { email: 'owner@test.com', password: 'password123', displayName: 'Owner', gameName: 'Test Game' },
  })
  const { token: ownerToken } = ownerRes.json()

  const eventRes = await app.inject({
    method: 'POST',
    url: '/events',
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { title: 'Session One', startAt: FUTURE_DATE, maxPlayers: 2 },
  })
  const event = eventRes.json()

  await app.inject({
    method: 'POST',
    url: `/events/${event.id}/publish`,
    headers: { authorization: `Bearer ${ownerToken}` },
  })

  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'player@test.com', password: 'password123', displayName: 'Player One' },
  })
  const playerLoginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'player@test.com', password: 'password123' },
  })
  const { token: playerToken } = playerLoginRes.json()

  return { app, ownerToken, playerToken, event }
}

describe('POST /events/:id/register', () => {
  it('player registers for a published event', async () => {
    const { app, playerToken, event } = await setupWithPublishedEvent()

    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.eventId).toBe(event.id)
    expect(body.status).toBe('pending')
    await app.close()
  })

  it('returns 409 when player registers twice', async () => {
    const { app, playerToken, event } = await setupWithPublishedEvent()

    await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })

    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('auto-waitlists when event is at confirmed capacity', async () => {
    const { app, ownerToken, playerToken, event } = await setupWithPublishedEvent()

    // Fill capacity with confirmed registrations using 2 other players
    for (const email of ['p2@test.com', 'p3@test.com']) {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email, password: 'password123', displayName: email },
      })
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, password: 'password123' },
      })
      const { token } = loginRes.json()
      const regRes = await app.inject({
        method: 'POST',
        url: `/events/${event.id}/register`,
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      })
      // Confirm each registration
      await app.inject({
        method: 'PATCH',
        url: `/events/${event.id}/registrations/${regRes.json().id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'confirmed' },
      })
    }

    // Now player registers — should be waitlisted
    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().status).toBe('waitlist')
    await app.close()
  })

  it('returns 400 for draft events', async () => {
    const app = buildApp()
    await app.ready()

    const ownerRes = await app.inject({
      method: 'POST',
      url: '/auth/setup',
      payload: { email: 'owner2@test.com', password: 'password123', displayName: 'Owner', gameName: 'Test Game' },
    })
    const { token: ownerToken } = ownerRes.json()

    const draftEvent = (await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Draft Event', startAt: FUTURE_DATE },
    })).json()

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'player2@test.com', password: 'password123', displayName: 'Player' },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'player2@test.com', password: 'password123' },
    })
    const { token } = loginRes.json()

    const res = await app.inject({
      method: 'POST',
      url: `/events/${draftEvent.id}/register`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('GET /events/:id/registrations', () => {
  it('owner sees all registrations', async () => {
    const { app, ownerToken, playerToken, event } = await setupWithPublishedEvent()

    await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })

    const res = await app.inject({
      method: 'GET',
      url: `/events/${event.id}/registrations`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })

  it('player sees only their own registrations', async () => {
    const { app, playerToken, event } = await setupWithPublishedEvent()

    await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })

    const res = await app.inject({
      method: 'GET',
      url: `/events/${event.id}/registrations`,
      headers: { authorization: `Bearer ${playerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })
})

describe('PATCH /events/:id/registrations/:regId', () => {
  it('owner can confirm a registration', async () => {
    const { app, ownerToken, playerToken, event } = await setupWithPublishedEvent()

    const regRes = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })
    const reg = regRes.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${event.id}/registrations/${reg.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { status: 'confirmed' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('confirmed')
    await app.close()
  })

  it('player can cancel their own registration', async () => {
    const { app, playerToken, event } = await setupWithPublishedEvent()

    const regRes = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })
    const reg = regRes.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${event.id}/registrations/${reg.id}`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { status: 'cancelled' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('cancelled')
    await app.close()
  })

  it('player cannot confirm their own registration', async () => {
    const { app, playerToken, event } = await setupWithPublishedEvent()

    const regRes = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/register`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: {},
    })

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${event.id}/registrations/${regRes.json().id}`,
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { status: 'confirmed' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})
