import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '../../app.js'

vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  }
}))

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    accounts: { create: vi.fn().mockResolvedValue({ id: 'acct_test123' }) },
    accountLinks: { create: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com/setup/s/test' }) },
    webhooks: { constructEvent: vi.fn() },
  })),
}))

describe('Stripe routes', () => {
  it('GET /stripe/status returns 401 without auth', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/stripe/status',
      headers: { 'x-game-id': 'game-uuid-123' },
    })
    expect(res.statusCode).toBe(401)
  })
})
