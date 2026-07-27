export interface MembershipValue {
  role: 'owner' | 'gm' | 'player'
  gameStatus: 'active' | 'inactive'
}

interface CachedMembership extends MembershipValue {
  expiresAt: number
}

const cache = new Map<string, CachedMembership>()
const TTL_MS = 30_000

// Periodic sweep to prevent unbounded memory growth from expired entries
// that were never re-accessed. Runs every 60 seconds.
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}, 60_000).unref()

export function getCachedMembership(userId: string, gameId: string): MembershipValue | null {
  const key = `${userId}:${gameId}`
  const entry = cache.get(key)
  if (entry && entry.expiresAt > Date.now()) {
    return { role: entry.role, gameStatus: entry.gameStatus }
  }
  cache.delete(key)
  return null
}

export function setCachedMembership(userId: string, gameId: string, value: MembershipValue): void {
  cache.set(`${userId}:${gameId}`, { ...value, expiresAt: Date.now() + TTL_MS })
}

export function invalidateMembership(userId: string, gameId: string): void {
  cache.delete(`${userId}:${gameId}`)
}

export function clearAll(): void {
  cache.clear()
}
