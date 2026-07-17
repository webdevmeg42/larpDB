'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import type { AdventureEvent, EventRegistration, Character } from '@plotrunner/shared'
import { ArrowLeft } from 'lucide-react'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
}

export default function EventDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [event, setEvent] = useState<AdventureEvent | null>(null)
  const [myReg, setMyReg] = useState<EventRegistration | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharId, setSelectedCharId] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !id) return
    void (async () => {
      try {
        const [evt, regs, chars] = await Promise.all([
          api.get<AdventureEvent>(`/events/${id}`),
          api.get<EventRegistration[]>(`/events/${id}/registrations`),
          api.get<Character[]>('/characters'),
        ])
        setEvent(evt)
        setMyReg(regs[0] ?? null)
        setCharacters(chars)
      } catch (err) {
        const status = (err as { status?: number }).status
        if (status === 404 || status === 403) {
          setNotFound(true)
        } else {
          setLoadError('Failed to load event. Please refresh.')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [user, id])

  if (!user) return null
  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (notFound || !event) {
    return (
      <div className="p-6 text-muted-foreground">
        {loadError ?? 'Event not found.'}
      </div>
    )
  }

  const status = myReg?.status ?? null
  const isOpen = event.status === 'published'

  async function handleRegister() {
    setActionLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const body = selectedCharId ? { characterId: selectedCharId } : {}
      const reg = await api.post<EventRegistration>(`/events/${id}/register`, body)
      setMyReg(reg)
      setFeedback(
        reg.status === 'waitlist'
          ? "You've been added to the waitlist."
          : 'Registered successfully.',
      )
    } catch {
      setError('Failed to register. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!myReg) return
    setActionLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const updated = await api.patch<EventRegistration>(
        `/events/${id}/registrations/${myReg.id}`,
        { status: 'cancelled' },
      )
      setMyReg(updated)
      setFeedback('Registration cancelled.')
    } catch {
      setError('Failed to cancel registration. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/events" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold flex-1">{event.title}</h1>
        <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
          {event.status}
        </Badge>
      </div>

      <div className="space-y-3 mb-6 text-sm">
        <div>
          <span className="font-medium">Date: </span>
          <span className="text-muted-foreground">{formatDateTime(event.startAt)}</span>
          {event.endAt && (
            <span className="text-muted-foreground"> — {formatDateTime(event.endAt)}</span>
          )}
        </div>
        {event.location && (
          <div>
            <span className="font-medium">Location: </span>
            <span className="text-muted-foreground">{event.location}</span>
          </div>
        )}
        {event.maxPlayers !== null && (
          <div>
            <span className="font-medium">Capacity: </span>
            <span className="text-muted-foreground">{event.maxPlayers} players</span>
          </div>
        )}
        {event.description && (
          <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{event.description}</p>
        )}
      </div>

      {feedback && <p className="mb-4 text-sm text-green-600">{feedback}</p>}
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {isOpen && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-medium">Registration</h2>

          {(status === null || status === 'cancelled') && (
            <>
              {characters.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="charSelect">
                    Play as (optional)
                  </label>
                  <Select
                    id="charSelect"
                    value={selectedCharId}
                    onChange={e => setSelectedCharId(e.target.value)}
                  >
                    <option value="">No character selected</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              )}
              <Button onClick={() => void handleRegister()} disabled={actionLoading}>
                {actionLoading ? 'Registering…' : status === 'cancelled' ? 'Register again' : 'Register'}
              </Button>
            </>
          )}

          {(status === 'pending' || status === 'confirmed') && (
            <div className="flex items-center gap-3">
              <Badge>Registered</Badge>
              <Button
                variant="outline"
                onClick={() => void handleCancel()}
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling…' : 'Cancel registration'}
              </Button>
            </div>
          )}

          {status === 'waitlist' && (
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Waitlisted</Badge>
              <Button
                variant="outline"
                onClick={() => void handleCancel()}
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling…' : 'Cancel'}
              </Button>
            </div>
          )}
        </div>
      )}

      {!isOpen && (
        <p className="text-sm text-muted-foreground">This event is not currently open for registration.</p>
      )}
    </div>
  )
}
