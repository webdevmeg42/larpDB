'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { SubscribeButton } from '@/components/SubscribeButton'
import { cn } from '@/lib/utils'

interface BrowseGame {
  id: string
  name: string
  description: string | null
  slug: string
  joinMode: 'open' | 'approval'
  memberCount: number
}

export default function BrowsePage() {
  const [games, setGames] = useState<BrowseGame[]>([])
  const [loading, setLoading] = useState(true)
  const [joinModeFilter, setJoinModeFilter] = useState<'any' | 'open'>('any')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<BrowseGame[]>('/games')
      .then(setGames)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = games.filter(g => {
    if (joinModeFilter === 'open' && g.joinMode !== 'open') return false
    if (search) {
      const q = search.toLowerCase()
      if (!g.name.toLowerCase().includes(q) && !(g.description ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Browse LARPs</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          My feed →
        </Link>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="w-44 flex-shrink-0 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Search</p>
            <input
              type="text"
              placeholder="Name or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Join mode</p>
            {(['any', 'open'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setJoinModeFilter(mode)}
                className={cn(
                  'block w-full text-left rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  joinModeFilter === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {mode === 'any' ? 'Any' : 'Open only'}
              </button>
            ))}
          </div>
        </aside>

        {/* LARP list */}
        <main className="flex-1 space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No LARPs found.</p>
          ) : (
            filtered.map(g => (
              <div
                key={g.id}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/larps/${g.slug}`}
                    className="font-semibold hover:underline"
                  >
                    {g.name}
                  </Link>
                  {g.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{g.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'} ·{' '}
                    {g.joinMode === 'open' ? 'Open' : 'Approval required'}
                  </p>
                </div>
                <SubscribeButton gameId={g.id} />
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  )
}
