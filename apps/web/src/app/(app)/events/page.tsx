'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PlusCircle } from 'lucide-react'
import type { LarpEvent, EventRegistration } from '@larpdb/shared'

type EventBadge = 'Open' | 'Registered' | 'Waitlisted' | 'Cancelled'

function getEventBadge(reg: EventRegistration | undefined): EventBadge {
  if (!reg) return 'Open'
  if (reg.status === 'confirmed' || reg.status === 'pending') return 'Registered'
  if (reg.status === 'waitlist') return 'Waitlisted'
  return 'Cancelled'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<LarpEvent[]>([])
  const [regMap, setRegMap] = useState<Record<string, EventRegistration | undefined>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void (async () => {
      try {
        const evts = await api.get<LarpEvent[]>('/events')
        setEvents(evts)
        const regResults = await Promise.all(
          evts.map(evt => api.get<EventRegistration[]>(`/events/${evt.id}/registrations`)),
        )
        const map: Record<string, EventRegistration | undefined> = {}
        evts.forEach((evt, i) => {
          const regs = regResults[i] ?? []
          map[evt.id] = regs[0]
        })
        setRegMap(map)
      } catch {
        setError('Failed to load events. Please refresh.')
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  if (!user) return null

  const canCreate = user.role === 'owner' || user.role === 'gm'

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Events</h1>
        {canCreate && (
          <Link
            href="/events/new"
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Event
          </Link>
        )}
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">No upcoming events.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Event</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {events.map(evt => {
                  const badge = getEventBadge(regMap[evt.id])
                  return (
                    <tr key={evt.id} className="border-b last:border-0">
                      <td className="p-4 font-medium">{evt.title}</td>
                      <td className="p-4 text-muted-foreground">{formatDate(evt.startAt)}</td>
                      <td className="p-4 text-muted-foreground">{evt.location ?? '—'}</td>
                      <td className="p-4">
                        {badge === 'Registered' && <Badge>Registered</Badge>}
                        {badge === 'Waitlisted' && <Badge variant="secondary">Waitlisted</Badge>}
                        {badge === 'Cancelled' && <Badge variant="outline">Cancelled</Badge>}
                        {badge === 'Open' && <Badge variant="outline">Open</Badge>}
                      </td>
                      <td className="p-4">
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
