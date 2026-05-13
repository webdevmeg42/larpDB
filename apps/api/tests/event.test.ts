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
  const { token: ownerToken, user: ownerUser } = ownerRes.json()

  const gmRegRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'gm@test.com', password: 'password123', displayName: 'GM User' },
  })
  const { user: gmUser } = gmRegRes.json()

  await app.inject({
    method: 'PATCH',
    url: `/users/${gmUser.id}/role`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { role: 'gm' },
  })

  const gmLoginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'gm@test.com', password: 'password123' },
  })
  const { token: gmToken } = gmLoginRes.json()

  const playerRegRes = await app.inject({
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

  return { app, ownerToken, gmToken, playerToken }
}

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

describe('POST /events', () => {
  it('owner can create a draft event', async () => {
    const { app, ownerToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Session One', startAt: FUTURE_DATE, maxPlayers: 20 },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.title).toBe('Session One')
    expect(body.status).toBe('draft')
    expect(body.maxPlayers).toBe(20)
    await app.close()
  })

  it('GM can create a draft event', async () => {
    const { app, gmToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { title: 'GM Event', startAt: FUTURE_DATE },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().status).toBe('draft')
    await app.close()
  })

  it('player cannot create events', async () => {
    const { app, playerToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { title: 'Player Event', startAt: FUTURE_DATE },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /events', () => {
  it('player sees only published events', async () => {
    const { app, ownerToken, playerToken } = await setupOwnerAndGm()

    await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Draft Event', startAt: FUTURE_DATE },
    })

    const pubRes = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Published Event', startAt: FUTURE_DATE },
    })
    await app.inject({
      method: 'POST',
      url: `/events/${pubRes.json().id}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/events',
      headers: { authorization: `Bearer ${playerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.length).toBe(1)
    expect(body[0].title).toBe('Published Event')
    await app.close()
  })

  it('owner sees all events regardless of status', async () => {
    const { app, ownerToken } = await setupOwnerAndGm()

    await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Draft', startAt: FUTURE_DATE },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })
})

describe('PATCH /events/:id', () => {
  it('owner can update event fields', async () => {
    const { app, ownerToken } = await setupOwnerAndGm()

    const createRes = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Old Title', startAt: FUTURE_DATE },
    })
    const event = createRes.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${event.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'New Title', location: 'The Hall' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().title).toBe('New Title')
    expect(res.json().location).toBe('The Hall')
    await app.close()
  })
})

describe('POST /events/:id/publish', () => {
  it('publishes a draft event', async () => {
    const { app, ownerToken } = await setupOwnerAndGm()

    const event = (await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'My Event', startAt: FUTURE_DATE },
    })).json()

    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('published')
    await app.close()
  })

  it('returns 400 when publishing a non-draft event', async () => {
    const { app, ownerToken } = await setupOwnerAndGm()

    const event = (await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'My Event', startAt: FUTURE_DATE },
    })).json()

    await app.inject({
      method: 'POST',
      url: `/events/${event.id}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

describe('POST /events/:id/archive', () => {
  it('archives a published event', async () => {
    const { app, ownerToken } = await setupOwnerAndGm()

    const event = (await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'My Event', startAt: FUTURE_DATE },
    })).json()

    await app.inject({
      method: 'POST',
      url: `/events/${event.id}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/events/${event.id}/archive`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('archived')
    await app.close()
  })
})
