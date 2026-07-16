'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getGameId, setGameId } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CalendarDays, Plus, X } from 'lucide-react'
import { EventCalendar } from './_components/EventCalendar'

type EventWithReg = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  location: string | null
  status: 'draft' | 'published' | 'archived'
  userRegistration: { status: 'confirmed' | 'pending' | 'waitlist' | 'cancelled' } | null
}

type GameWithEvents = {
  id: string
  name: string
  role: 'owner' | 'gm' | 'player'
  events: EventWithReg[]
}

type TimeFilter = 'upcoming' | 'past' | 'all'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function EventsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [games, setGames] = useState<GameWithEvents[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming')
  const [loading, setLoading] = useState(true)
  const [calendarView, setCalendarView] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [calendarDayFilter, setCalendarDayFilter] = useState<Date | null>(null)

  useEffect(() => {
    if (!user) return
    api
      .get<{ games: GameWithEvents[] }>('/my-events')
      .then(data => {
        setGames(data.games)
        if (data.games.length > 0) {
          const saved = getGameId()
          const initial = data.games.find(g => g.id === saved) ?? data.games[0]!
          setSelectedGameId(initial.id)
          setGameId(initial.id)
        }
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  }, [user])

  const today = new Date().toISOString()

  const matchesFilter = (e: EventWithReg) => {
    const matchesTime =
      timeFilter === 'upcoming' ? e.startAt >= today && e.status !== 'archived' :
      timeFilter === 'past'     ? e.startAt < today :
      true
    const matchesSearch = !search || e.title.toLowerCase().includes(search.toLowerCase())
    const matchesDay = !calendarDayFilter || (() => {
      const evtStart = new Date(new Date(e.startAt).toDateString())
      const evtEnd = e.endAt ? new Date(new Date(e.endAt).toDateString()) : evtStart
      const filterDay = new Date(calendarDayFilter.toDateString())
      return evtStart <= filterDay && filterDay <= evtEnd
    })()
    return matchesTime && matchesSearch && matchesDay
  }

  const filteredGames = games.filter(
    g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.events.some(e => e.title.toLowerCase().includes(search.toLowerCase())),
  )

  const selectedGame =
    filteredGames.find(g => g.id === selectedGameId) ??
    (selectedGameId === null ? (filteredGames[0] ?? null) : null)

  const visibleEvents = selectedGame ? selectedGame.events.filter(matchesFilter) : []

  if (!user) return null

  if (loading) {
    return <p className="p-6 text-muted-foreground">Loading…</p>
  }

  if (games.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">You haven&apos;t joined any Adventures yet.</p>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Events</h1>

      {/* Search bar */}
      <div className="flex gap-2 max-w-xl items-center">
        <div className="relative flex-1">
          <input
            data-testid="events-search-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Adventures or events…"
            aria-label="Search Adventures or events"
            className="w-full px-4 py-2 rounded-md border border-border bg-card text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          data-testid="events-time-filter"
          value={timeFilter}
          onChange={e => setTimeFilter(e.target.value as TimeFilter)}
          className="rounded-md border border-border bg-card text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
        >
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Master / detail panels */}
      <div className="flex gap-4 min-h-[400px]">
        {/* Left panel — Adventure list */}
        <Card className="w-64 shrink-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-3 py-2 bg-muted text-xs font-semibold text-muted-foreground border-b border-border uppercase tracking-wide">
              Your Adventures
            </div>
            {filteredGames.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground italic">
                No results for &ldquo;{search}&rdquo;
              </p>
            ) : (
              filteredGames.map(g => {
                const eventCount = g.events.filter(matchesFilter).length
                const hasEvents = eventCount > 0
                return (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGameId(g.id); setGameId(g.id) }}
                    className={`w-full text-left px-3 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                      selectedGame?.id === g.id ? 'bg-muted' : ''
                    }`}
                  >
                    <p
                      className={`text-sm font-medium truncate ${
                        !hasEvents ? 'text-muted-foreground italic' : ''
                      }`}
                    >
                      {g.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {!hasEvents
                        ? timeFilter === 'upcoming' ? 'no upcoming events'
                          : timeFilter === 'past' ? 'no past events'
                          : 'no events'
                        : `${eventCount} event${eventCount === 1 ? '' : 's'}`}
                    </p>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Right panel — event table */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            {selectedGame ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {selectedGame.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      data-testid="calendar-toggle"
                      type="button"
                      onClick={() => { setCalendarView(v => !v); setCalendarDayFilter(null) }}
                      className={cn(buttonVariants({ variant: calendarView ? 'default' : 'outline', size: 'sm' }))}
                    >
                      <CalendarDays className="h-4 w-4 mr-1" />
                      {calendarView ? 'List' : 'Calendar'}
                    </button>
                    {(selectedGame.role === 'owner' || selectedGame.role === 'gm') && (
                      <button
                        data-testid="new-event-btn"
                        type="button"
                        onClick={() => { setGameId(selectedGame.id); router.push('/events/new') }}
                        className={buttonVariants({ variant: 'default', size: 'sm' })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Event
                      </button>
                    )}
                  </div>
                </div>

                {calendarView && (
                  <EventCalendar
                    key={selectedGame.id}
                    events={selectedGame.events}
                    games={games}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    onDayFilter={setCalendarDayFilter}
                  />
                )}

                {visibleEvents.length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm text-muted-foreground">
                      {timeFilter === 'upcoming' ? 'No upcoming events.'
                        : timeFilter === 'past' ? 'No past events.'
                        : 'No events.'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Title</th>
                        <th className="px-4 py-2 font-medium">Date</th>
                        <th className="px-4 py-2 font-medium">Location</th>
                        <th className="px-4 py-2 font-medium">Registration</th>
                        <th className="px-4 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEvents.map(evt => {
                        const reg = evt.userRegistration
                        return (
                          <tr
                            key={evt.id}
                            className="border-b border-border last:border-b-0 hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 font-medium">{evt.title}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDate(evt.startAt)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {evt.location ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              {reg === null ? (
                                <Badge variant="outline">Open</Badge>
                              ) : reg.status === 'confirmed' || reg.status === 'pending' ? (
                                <Badge>Registered</Badge>
                              ) : reg.status === 'waitlist' ? (
                                <Badge variant="secondary">Waitlisted</Badge>
                              ) : (
                                <Badge variant="outline">Cancelled</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/events/${evt.id}`}
                                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-muted-foreground">Select an Adventure to view events.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
