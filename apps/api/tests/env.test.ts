import { describe, it, expect, vi } from 'vitest'

describe('env validation', () => {
  it('throws if DATABASE_URL is missing', async () => {
    const original = process.env['DATABASE_URL']
    delete process.env['DATABASE_URL']
    await expect(import('../src/env.js')).rejects.toThrow()
    if (original !== undefined) process.env['DATABASE_URL'] = original
  })

  it('STORAGE_PROVIDER defaults to local', async () => {
    vi.resetModules()
    const { env } = await import('../src/env.js')
    expect(env.STORAGE_PROVIDER).toBe('local')
  })
})
