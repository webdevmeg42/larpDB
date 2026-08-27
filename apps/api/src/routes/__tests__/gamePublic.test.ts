import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '../../app.js'

vi.mock('../../db/index.js', () => {
  const makeChain = (resolveValue: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {}
    ;['from', 'where', 'innerJoin', 'leftJoin', 'orderBy'].forEach((m) => {
      chain[m] = vi.fn().mockReturnValue(chain)
    })
    chain.limit = vi.fn().mockResolvedValue(resolveValue)
    // Make chain itself awaitable for queries that terminate without .limit()
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolveValue).then(resolve)
    return chain
  }

  const lockedGameChain = makeChain([
    { id: 'game-uuid-1', stripeOnboardingComplete: false },
  ])

  return {
    db: {
      select: vi.fn().mockReturnValue(lockedGameChain),
    },
  }
})

describe('GET /games/:slug/store', () => {
  it('returns locked:true when stripeOnboardingComplete is false', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/games/test-slug/store',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ locked: boolean; items: unknown[] }>()
    expect(body.locked).toBe(true)
    expect(body.items).toEqual([])
  })
})
