import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

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

describe('POST /plots', () => {
  it('GM can create a plot', async () => {
    const { app, gmToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}` },
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
    const { app, playerToken } = await setupOwnerAndGm()

    const res = await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { title: 'Forbidden Plot' },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /plots', () => {
  it('GM can list plots', async () => {
    const { app, gmToken } = await setupOwnerAndGm()

    await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { title: 'Plot One' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBe(1)
    await app.close()
  })
})

describe('PATCH /plots/:id', () => {
  it('can update title and resolve a plot', async () => {
    const { app, gmToken } = await setupOwnerAndGm()

    const plot = (await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { title: 'Active Plot' },
    })).json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/plots/${plot.id}`,
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { status: 'resolved', title: 'Resolved Plot' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('resolved')
    expect(res.json().title).toBe('Resolved Plot')
    await app.close()
  })

  it('can link events to a plot', async () => {
    const { app, ownerToken, gmToken } = await setupOwnerAndGm()

    const eventRes = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Linked Event', startAt: FUTURE_DATE },
    })
    const event = eventRes.json()

    const plot = (await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { title: 'My Plot' },
    })).json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/plots/${plot.id}`,
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { linkedEventIds: [event.id] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().linkedEventIds).toContain(event.id)
    await app.close()
  })
})

describe('DELETE /plots/:id', () => {
  it('GM can delete a plot', async () => {
    const { app, gmToken } = await setupOwnerAndGm()

    const plot = (await app.inject({
      method: 'POST',
      url: '/plots',
      headers: { authorization: `Bearer ${gmToken}` },
      payload: { title: 'To Delete' },
    })).json()

    const res = await app.inject({
      method: 'DELETE',
      url: `/plots/${plot.id}`,
      headers: { authorization: `Bearer ${gmToken}` },
    })

    expect(res.statusCode).toBe(204)
    await app.close()
  })
})
