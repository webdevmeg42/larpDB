import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCachedMembership, setCachedMembership, invalidateMembership, clearAll } from '../membershipCache.js'

describe('membershipCache', () => {
  beforeEach(() => {
    clearAll()
    vi.restoreAllMocks()
  })

  it('returns null for an unknown key', () => {
    const result = getCachedMembership('user-1', 'game-1')
    expect(result).toBeNull()
  })

  it('returns a cached entry within TTL', () => {
    setCachedMembership('user-1', 'game-1', { role: 'player', gameStatus: 'active' })
    const result = getCachedMembership('user-1', 'game-1')
    expect(result).toEqual({ role: 'player', gameStatus: 'active' })
  })

  it('returns null after invalidation', () => {
    setCachedMembership('user-1', 'game-1', { role: 'gm', gameStatus: 'active' })
    invalidateMembership('user-1', 'game-1')
    const result = getCachedMembership('user-1', 'game-1')
    expect(result).toBeNull()
  })

  it('returns null after TTL expires', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValueOnce(now + 31_000)
    setCachedMembership('user-1', 'game-1', { role: 'owner', gameStatus: 'inactive' })
    const result = getCachedMembership('user-1', 'game-1')
    expect(result).toBeNull()
  })
})
