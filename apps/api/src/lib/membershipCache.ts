interface CachedMembership {
  role: 'owner' | 'gm' | 'player'
  gameStatus: 'active' | 'inactive'
  expiresAt: number
}

const cache = new Map<string, CachedMembership>()
const TTL_MS = 30_000

export function getCachedMembership(
  userId: string,
  gameId: string,
): { role: 'owner' | 'gm' | 'player'; gameStatus: 'active' | 'inactive' } | null {
  const key = `${userId}:${gameId}`
  const entry = cache.get(key)
  if (entry && entry.expiresAt > Date.now()) {
    return { role: entry.role, gameStatus: entry.gameStatus }
  }
  cache.delete(key)
  return null
}

export function setCachedMembership(
  userId: string,
  gameId: string,
  value: { role: 'owner' | 'gm' | 'player'; gameStatus: 'active' | 'inactive' },
): void {
  cache.set(`${userId}:${gameId}`, { ...value, expiresAt: Date.now() + TTL_MS })
}

export function invalidateMembership(userId: string, gameId: string): void {
  cache.delete(`${userId}:${gameId}`)
}
