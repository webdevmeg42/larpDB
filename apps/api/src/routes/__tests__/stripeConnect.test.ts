import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../app.js'
import { env } from '../../env.js'

// IMPORTANT: singleFork: true in vitest.config.ts means vi.mock() calls persist across
// all test files. We must NOT mock env.js — instead, mutate the real shared env object
// directly and restore it in afterEach.
const mutableEnv = env as Record<string, unknown>
let savedStripeKey: unknown
let savedWebhookSecret: unknown

beforeEach(() => {
  savedStripeKey = mutableEnv.STRIPE_SECRET_KEY
  savedWebhookSecret = mutableEnv.STRIPE_WEBHOOK_SECRET
  mutableEnv.STRIPE_SECRET_KEY = undefined
  mutableEnv.STRIPE_WEBHOOK_SECRET = undefined
})

afterEach(() => {
  mutableEnv.STRIPE_SECRET_KEY = savedStripeKey
  mutableEnv.STRIPE_WEBHOOK_SECRET = savedWebhookSecret
})

vi.mock('../../db/index.js', () => {
  const makeSelectChain = (resolveValue: unknown) => {
    const chain = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn().mockResolvedValue(resolveValue),
      innerJoin: vi.fn(),
    }
    chain.from.mockReturnValue(chain)
    chain.where.mockReturnValue(chain)
    chain.innerJoin.mockReturnValue(chain)
    return chain
  }

  const makeUpdateChain = (resolveValue: unknown) => {
    const chain = {
      set: vi.fn(),
      where: vi.fn(),
      returning: vi.fn().mockResolvedValue(resolveValue),
    }
    chain.set.mockReturnValue(chain)
    chain.where.mockReturnValue(chain)
    return chain
  }

  return {
    db: {
      select: vi.fn(() => makeSelectChain([{ id: 'game-uuid-123', stripeAccountId: null, stripeOnboardingComplete: false }])),
      update: vi.fn(() => makeUpdateChain([{ stripeAccountId: 'acct_test123' }])),
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
    mutableEnv.STRIPE_SECRET_KEY = 'sk_test_fake'
    mutableEnv.STRIPE_WEBHOOK_SECRET = 'whsec_fake'
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
