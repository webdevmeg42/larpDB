'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronRight, X } from 'lucide-react'

type AdminSubscriber = {
  id: string
  userId: string
  displayName: string
  email: string
  subscribedAt: string
}

type SubscriberGame = {
  id: string
  name: string
  subscribers: AdminSubscriber[]
}

export function SubscriptionsTab() {
  const { user } = useAuth()
  const [games, setGames] = useState<SubscriberGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const loadSubscriptions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ games: SubscriberGame[] }>('/admin-subscriptions')
      setGames(data.games)
    } catch {
      setError('Failed to load subscriptions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadSubscriptions()
  }, [user, loadSubscriptions])

  useEffect(() => {
    if (!search) { setOpenSections(new Set()); return }
    const newOpen = new Set<string>()
    for (const g of games) {
      if (g.subscribers.some(s => s.displayName.toLowerCase().includes(search.toLowerCase()))) {
        newOpen.add(g.id)
      }
    }
    setOpenSections(newOpen)
  }, [search, games])

  function toggleSection(gameId: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(gameId)) next.delete(gameId)
      else next.add(gameId)
      return next
    })
  }

  const filteredGames = search
    ? games
        .map(g => ({ ...g, subscribers: g.subscribers.filter(s => s.displayName.toLowerCase().includes(search.toLowerCase())) }))
        .filter(g => g.subscribers.length > 0)
    : games

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search subscribers…"
          aria-label="Search subscribers"
          className="w-full px-4 py-2 rounded-md border border-border bg-card text-sm pr-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {games.length === 0 ? (
        <p className="text-muted-foreground text-sm">No subscribers in any of your Adventures yet.</p>
      ) : filteredGames.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No results for &ldquo;{search}&rdquo;</p>
      ) : (
        <div className="space-y-2">
          {filteredGames.map(g => {
            const isOpen = openSections.has(g.id)
            return (
              <Card key={g.id}>
                <button
                  onClick={() => toggleSection(g.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                >
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="font-medium text-sm flex-1">{g.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {g.subscribers.length} subscriber{g.subscribers.length !== 1 ? 's' : ''}
                  </Badge>
                </button>
                {isOpen && (
                  <CardContent className="p-0 border-t border-border">
                    {g.subscribers.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">No subscribers yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="px-4 py-2 font-medium">Name</th>
                            <th className="px-4 py-2 font-medium">Email</th>
                            <th className="px-4 py-2 font-medium">Subscribed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.subscribers.map(s => (
                            <tr key={s.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                              <td className="px-4 py-3 font-medium">{s.displayName}</td>
                              <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {new Date(s.subscribedAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
