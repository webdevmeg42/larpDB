import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

const SIMPLE_FIELDS = [
  { id: '11111111-1111-1111-1111-111111111111', label: 'Name', type: 'text' as const, required: true, order: 0 },
]

async function setupOwner() {
  const app = buildApp()
  await app.ready()
  const res = await app.inject({
    method: 'POST',
    url: '/auth/setup',
    payload: { email: 'owner@test.com', password: 'password123', displayName: 'Owner', gameName: 'Test Game' },
  })
  const { token } = res.json()
  return { app, token }
}

describe('POST /character-schemas', () => {
  it('creates a schema (owner only)', async () => {
    const { app, token } = await setupOwner()

    const res = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Hero Sheet')
    expect(body.version).toBe(1)
    expect(body.isActive).toBe(false)
    await app.close()
  })

  it('returns 403 for non-owner', async () => {
    const { app } = await setupOwner()
    const playerToken = app.jwt.sign({ sub: 'fake-id', role: 'player' })

    const res = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('returns 401 without token', async () => {
    const { app } = await setupOwner()
    const res = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('GET /character-schemas', () => {
  it('returns all schemas', async () => {
    const { app, token } = await setupOwner()

    await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(1)
    await app.close()
  })
})

describe('PATCH /character-schemas/:id', () => {
  it('creates a new version of the schema', async () => {
    const { app, token } = await setupOwner()

    const createRes = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
    })
    const original = createRes.json()

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/character-schemas/${original.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Hero Sheet v2' },
    })

    expect(patchRes.statusCode).toBe(201)
    const newVersion = patchRes.json()
    expect(newVersion.name).toBe('Hero Sheet v2')
    expect(newVersion.version).toBe(2)
    expect(newVersion.id).not.toBe(original.id)
    await app.close()
  })
})

describe('POST /character-schemas/:id/activate', () => {
  it('activates a schema and deactivates others', async () => {
    const { app, token } = await setupOwner()

    const r1 = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Schema A', fields: SIMPLE_FIELDS },
    })
    const r2 = await app.inject({
      method: 'POST',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Schema B', fields: SIMPLE_FIELDS },
    })

    const activateRes = await app.inject({
      method: 'POST',
      url: `/character-schemas/${r1.json().id}/activate`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(activateRes.statusCode).toBe(200)
    expect(activateRes.json().isActive).toBe(true)

    const r2Get = await app.inject({
      method: 'GET',
      url: `/character-schemas/${r2.json().id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(r2Get.json().isActive).toBe(false)

    await app.close()
  })
})
