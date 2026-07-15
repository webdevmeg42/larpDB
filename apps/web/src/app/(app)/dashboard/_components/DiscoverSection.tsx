'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { SubscribeButton } from '@/components/SubscribeButton'

interface BrowseGame {
  id: string
  name: string
  description: string | null
  slug: string
  joinMode: 'open' | 'approval'
  memberCount: number
}

export function DiscoverSection() {
  const [games, setGames] = useState<BrowseGame[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const gamesReq = api.get<{ items: BrowseGame[] }>('/games')
    const subsReq = api.get<{ gameId: string }[]>('/subscriptions').catch(() => [] as { gameId: string }[])

    Promise.all([gamesReq, subsReq])
      .then(([gamesRes, subs]) => {
        setGames(gamesRes.items)
        setSubscribedIds(new Set(subs.map(s => s.gameId)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="border-t pt-8 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Discover Adventures</h2>
        <Link href="/browse" className="text-sm text-muted-foreground hover:underline">
          Browse all →
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : games.length === 0 ? (
        <p className="text-muted-foreground text-sm">No Adventures available.</p>
      ) : (
        <div className="space-y-3">
          {games.map(g => (
            <div
              key={g.id}
              data-testid="discover-game-row"
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'} ·{' '}
                  {g.joinMode === 'open' ? 'Open' : 'Approval required'}
                </p>
              </div>
              <SubscribeButton gameId={g.id} initialSubscribed={subscribedIds.has(g.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
