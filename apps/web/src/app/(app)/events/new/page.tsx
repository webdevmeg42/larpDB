'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getGameId, setGameId } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AdventureEvent } from '@plotrunner/shared'

interface MyGame {
  id: string
  name: string
  slug: string
  status: string
  role: string
}

export default function NewEventPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [gameName, setGameName] = useState<string | null>(null)
  const [selectedGameId, setSelectedGameId] = useState('')
  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const gameId = getGameId()
    if (!gameId) {
      router.replace('/events')
      return
    }
    setSelectedGameId(gameId)
    api.get<MyGame[]>('/my-games')
      .then(all => {
        const match = all.find(g => g.id === gameId)
        if (match) setGameName(match.name)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  if (!user) return null

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGameId || !title.trim() || !startAt) return
    setSubmitting(true)
    setError(null)
    try {
      setGameId(selectedGameId)
      const body: Record<string, unknown> = {
        title: title.trim(),
        startAt: new Date(startAt).toISOString(),
      }
      if (endAt) body.endAt = new Date(endAt).toISOString()
      if (location.trim()) body.location = location.trim()
      if (description.trim()) body.description = description.trim()
      if (maxPlayers) body.maxPlayers = parseInt(maxPlayers, 10)

      const event = await api.post<AdventureEvent>('/events', body)
      router.push(`/events/${event.id}`)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create event')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New Event</h1>
        {gameName && <p className="text-sm text-muted-foreground mt-1">{gameName}</p>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Event name"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startAt">Start date &amp; time</Label>
            <Input
              id="startAt"
              type="datetime-local"
              value={startAt}
              onChange={e => setStartAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endAt">End date &amp; time (optional)</Label>
            <Input
              id="endAt"
              type="datetime-local"
              value={endAt}
              onChange={e => setEndAt(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location (optional)</Label>
          <Input
            id="location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Venue or address"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxPlayers">Max players (optional)</Label>
          <Input
            id="maxPlayers"
            type="number"
            min="1"
            value={maxPlayers}
            onChange={e => setMaxPlayers(e.target.value)}
            placeholder="Leave blank for unlimited"
            className="max-w-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Details about the event…"
            rows={5}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button data-testid="create-event-btn" type="submit" disabled={submitting || !selectedGameId || !title.trim() || !startAt}>
            {submitting ? 'Creating…' : 'Create Event'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
