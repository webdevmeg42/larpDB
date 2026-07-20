import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCachedMembership, setCachedMembership, invalidateMembership } from '../membershipCache.js'

describe('membershipCache', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Clear the module cache between tests by re-importing isn't feasible,
    // so invalidate the specific keys used in each test
  })

  it('returns null for an unknown key', () => {
    const result = getCachedMembership('user-1', 'game-1')
    expect(result).toBeNull()
  })

  it('returns a cached entry within TTL', () => {
    setCachedMembership('user-2', 'game-2', { role: 'player', gameStatus: 'active' })
    const result = getCachedMembership('user-2', 'game-2')
    expect(result).toEqual({ role: 'player', gameStatus: 'active' })
  })

  it('returns null after invalidation', () => {
    setCachedMembership('user-3', 'game-3', { role: 'gm', gameStatus: 'active' })
    invalidateMembership('user-3', 'game-3')
    const result = getCachedMembership('user-3', 'game-3')
    expect(result).toBeNull()
  })

  it('returns null after TTL expires', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValueOnce(now + 31_000)
    setCachedMembership('user-4', 'game-4', { role: 'owner', gameStatus: 'inactive' })
    const result = getCachedMembership('user-4', 'game-4')
    expect(result).toBeNull()
  })
})
