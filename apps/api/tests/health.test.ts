import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

describe('GET /health', () => {
  it('returns 200 with status and db fields when DB is reachable', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' })
    await app.close()
  })

  it('does not require authentication', async () => {
    const app = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).not.toBe(401)
    await app.close()
  })
})
