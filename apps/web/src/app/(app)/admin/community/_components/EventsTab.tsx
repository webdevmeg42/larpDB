'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { setGameId } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'

type AdminEvent = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  status: 'draft' | 'published' | 'archived'
}

type EventGame = {
  id: string
  name: string
  isActive: boolean
  events: AdminEvent[]
}

export function EventsTab() {
  const { user } = useAuth()
  const router = useRouter()
  const [games, setGames] = useState<EventGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [transitioningId, setTransitioningId] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ games: EventGame[] }>('/admin-events')
      setGames(data.games)
    } catch {
      setError('Failed to load events.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadEvents()
  }, [user, loadEvents])

  useEffect(() => {
    if (!search) { setOpenSections(new Set()); return }
    const newOpen = new Set<string>()
    for (const g of games) {
      if (g.events.some(e => e.title.toLowerCase().includes(search.toLowerCase()))) {
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

  async function handleTransition(g: EventGame, event: AdminEvent, action: 'publish' | 'archive') {
    setTransitioningId(event.id)
    setGameId(g.id)
    try {
      const updated = await api.post<AdminEvent>(`/events/${event.id}/${action}`, {})
      setGames(prev => prev.map(pg =>
        pg.id === g.id
          ? { ...pg, events: pg.events.map(ev => ev.id === updated.id ? updated : ev) }
          : pg
      ))
    } catch {
      setError(`Failed to ${action} event.`)
    } finally {
      setTransitioningId(null)
    }
  }

  const filteredGames = search
    ? games
        .map(g => ({ ...g, events: g.events.filter(e => e.title.toLowerCase().includes(search.toLowerCase())) }))
        .filter(g => g.events.length > 0)
    : games

  const statusBadge: Record<string, 'default' | 'secondary' | 'outline'> = {
    published: 'default', draft: 'secondary', archived: 'outline',
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events…"
          aria-label="Search events"
          className="w-full px-4 py-2 rounded-md border border-border bg-card text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {games.length === 0 ? (
        <p className="text-muted-foreground text-sm">You don&apos;t manage events for any LARPs yet.</p>
      ) : filteredGames.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No results for &ldquo;{search}&rdquo;</p>
      ) : (
        <div className="space-y-2">
          {filteredGames.map(g => {
            const isOpen = openSections.has(g.id)
            return (
              <Card key={g.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSection(g.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleSection(g.id) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="font-medium text-sm flex-1">{g.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {g.events.length} event{g.events.length !== 1 ? 's' : ''}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={e => { e.stopPropagation(); setGameId(g.id); router.push('/events/new') }}
                    className="ml-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Event
                  </Button>
                </div>
                {isOpen && (
                  <CardContent className="p-0 border-t border-border">
                    {g.events.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-3">
                        <p className="text-sm text-muted-foreground">No events yet.</p>
                        <Button size="sm" onClick={() => { setGameId(g.id); router.push('/events/new') }}>
                          <Plus className="h-4 w-4 mr-1" />
                          New Event
                        </Button>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="px-4 py-2 font-medium">Title</th>
                            <th className="px-4 py-2 font-medium">Start</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                            <th className="px-4 py-2 font-medium" />
                          </tr>
                        </thead>
                        <tbody>
                          {g.events.map(ev => (
                            <tr key={ev.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                              <td className="px-4 py-3 font-medium">{ev.title}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {new Date(ev.startAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={statusBadge[ev.status] ?? 'outline'}>{ev.status}</Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1.5 justify-end flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setGameId(g.id); router.push(`/events/${ev.id}`) }}
                                    disabled={transitioningId === ev.id}
                                  >
                                    Edit
                                  </Button>
                                  {ev.status === 'draft' && (
                                    <Button
                                      size="sm"
                                      onClick={() => void handleTransition(g, ev, 'publish')}
                                      disabled={transitioningId === ev.id}
                                    >
                                      {transitioningId === ev.id ? '…' : 'Publish'}
                                    </Button>
                                  )}
                                  {ev.status === 'published' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-muted-foreground"
                                      onClick={() => void handleTransition(g, ev, 'archive')}
                                      disabled={transitioningId === ev.id}
                                    >
                                      {transitioningId === ev.id ? '…' : 'Archive'}
                                    </Button>
                                  )}
                                </div>
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
