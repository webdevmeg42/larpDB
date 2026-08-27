import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../../app.js'

// Mock DB with chainable query builder
const mockDbUpdate = vi.fn()
const mockDbSelect = vi.fn()

const makeChain = (resolveValue: unknown) => {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'from', 'where', 'limit', 'update', 'set', 'innerJoin', 'returning']
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain) })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(chain as any).limit = vi.fn().mockResolvedValue(resolveValue)
  ;(chain as any).returning = vi.fn().mockResolvedValue(resolveValue)
  return chain
}

vi.mock('../../db/index.js', () => {
  const selectChain = makeChain([{ id: 'game-uuid-123', stripeAccountId: null, stripeOnboardingComplete: false }])
  const updateChain = makeChain([{ stripeAccountId: 'acct_test123' }])
  return {
    db: {
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue(updateChain),
    },
  }
})

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    accounts: { create: vi.fn().mockResolvedValue({ id: 'acct_test123' }) },
    accountLinks: { create: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com/setup/s/test' }) },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: 'account.updated',
        data: { object: { id: 'acct_test123', details_submitted: true, charges_enabled: true } },
      }),
    },
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

  it('POST /stripe/webhook returns 400 when stripe-signature header is missing', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake'
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/stripe/webhook',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'account.updated' }),
    })
    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: string }>()
    expect(body.error).toMatch(/stripe-signature/i)
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it('POST /stripe/webhook returns 503 when Stripe is not configured', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/stripe/webhook',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=123,v1=abc',
      },
      body: Buffer.from(JSON.stringify({ type: 'account.updated' })),
    })
    expect(res.statusCode).toBe(503)
  })
})
