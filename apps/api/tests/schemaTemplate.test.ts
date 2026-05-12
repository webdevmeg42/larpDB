import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'
import { testDb } from './setup.js'
import { schemaTemplates } from '../src/db/schema.js'

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

describe('GET /schema-templates', () => {
  it('returns seeded templates publicly', async () => {
    await testDb.insert(schemaTemplates).values({
      name: 'Fantasy Adventure',
      genre: 'Fantasy',
      description: 'Test template',
      fields: [{ id: '11111111-0001-0001-0001-000000000001', label: 'Class', type: 'text', required: true, order: 0 }],
      isBuiltin: true,
    })

    const { app } = await setupOwner()
    const res = await app.inject({ method: 'GET', url: '/schema-templates' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(1)
    expect(body[0].name).toBe('Fantasy Adventure')
    await app.close()
  })
})
