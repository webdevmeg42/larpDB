'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DatePicker } from '@/components/ui/date-picker'
import type { Character } from '@larpdb/shared'

type Member = {
  id: string
  userId: string
  role: 'owner' | 'gm' | 'player'
  status: string
  joinedAt: string
  displayName: string
  email: string
}

type Subscriber = {
  id: string
  userId: string
  subscribedAt: string
  displayName: string
  email: string
}

type Event = {
  id: string
  title: string
  tagline: string | null
  description: string | null
  location: string | null
  keyTimes: string | null
  travelNotes: string | null
  startAt: string
  endAt: string | null
  maxPlayers: number | null
  status: 'draft' | 'published' | 'archived'
  createdAt: string
}

const EMPTY_EVENT_FORM = {
  title: '',
  tagline: '',
  description: '',
  location: '',
  keyTimes: '',
  travelNotes: '',
  startAt: '',
  endAt: '',
  maxPlayers: '',
}

type EventForm = typeof EMPTY_EVENT_FORM

function toDateStr(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function toDatetime(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`
}

export default function CommunityPage() {
  const { user } = useAuth()
  const { game } = useSiteConfig()
  const isOwner = user?.role === 'owner'

  const [members, setMembers] = useState<Member[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingSubscribers, setLoadingSubscribers] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingCharacters, setLoadingCharacters] = useState(true)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [eventForm, setEventForm] = useState<EventForm>(EMPTY_EVENT_FORM)
  const [savingEvent, setSavingEvent] = useState(false)
  const [eventError, setEventError] = useState<string | null>(null)
  const [transitioningId, setTransitioningId] = useState<string | null>(null)

  const gameId = game?.id

  const loadMembers = useCallback(async () => {
    if (!gameId) return
    setLoadingMembers(true)
    try {
      const data = await api.get<Member[]>(`/games/${gameId}/members`)
      setMembers(data)
    } catch {
      setError('Failed to load members.')
    } finally {
      setLoadingMembers(false)
    }
  }, [gameId])

  const loadSubscribers = useCallback(async () => {
    if (!gameId) return
    setLoadingSubscribers(true)
    try {
      const data = await api.get<Subscriber[]>(`/games/${gameId}/subscriptions`)
      setSubscribers(data)
    } catch {
      setError('Failed to load subscriptions.')
    } finally {
      setLoadingSubscribers(false)
    }
  }, [gameId])

  const loadEvents = useCallback(async () => {
    if (!gameId) return
    setLoadingEvents(true)
    try {
      const data = await api.get<Event[]>('/events')
      setEvents(data)
    } catch {
      setError('Failed to load events.')
    } finally {
      setLoadingEvents(false)
    }
  }, [gameId])

  const loadCharacters = useCallback(async () => {
    if (!gameId) return
    setLoadingCharacters(true)
    try {
      const data = await api.get<Character[]>('/characters')
      setCharacters(data)
    } catch {
      setError('Failed to load characters.')
    } finally {
      setLoadingCharacters(false)
    }
  }, [gameId])

  useEffect(() => {
    if (!gameId) return
    void loadMembers()
    void loadSubscribers()
    void loadEvents()
    void loadCharacters()
  }, [gameId, loadMembers, loadSubscribers, loadEvents, loadCharacters])

  async function handleRoleChange(userId: string, newRole: 'gm' | 'player') {
    if (!gameId) return
    setPromoting(userId)
    setError(null)
    try {
      const updated = await api.patch<Member>(`/games/${gameId}/members/${userId}/role`, { role: newRole })
      setMembers(ms => ms.map(m => m.userId === userId ? { ...m, role: updated.role } : m))
    } catch {
      setError('Failed to update role. Please try again.')
    } finally {
      setPromoting(null)
    }
  }

  function openCreateForm() {
    setEditingEvent(null)
    setEventForm(EMPTY_EVENT_FORM)
    setEventError(null)
    setShowEventForm(true)
  }

  function openEditForm(event: Event) {
    setEditingEvent(event)
    setEventForm({
      title: event.title,
      tagline: event.tagline ?? '',
      description: event.description ?? '',
      location: event.location ?? '',
      keyTimes: event.keyTimes ?? '',
      travelNotes: event.travelNotes ?? '',
      startAt: toDateStr(event.startAt),
      endAt: toDateStr(event.endAt),
      maxPlayers: event.maxPlayers?.toString() ?? '',
    })
    setEventError(null)
    setShowEventForm(true)
  }

  function cancelEventForm() {
    setShowEventForm(false)
    setEditingEvent(null)
    setEventError(null)
  }

  async function handleEventSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!eventForm.startAt) { setEventError('Start date is required.'); return }
    setSavingEvent(true)
    setEventError(null)
    try {
      const payload = {
        title: eventForm.title,
        tagline: eventForm.tagline || null,
        description: eventForm.description || null,
        location: eventForm.location || null,
        keyTimes: eventForm.keyTimes || null,
        travelNotes: eventForm.travelNotes || null,
        startAt: toDatetime(eventForm.startAt),
        endAt: eventForm.endAt ? toDatetime(eventForm.endAt) : null,
        maxPlayers: eventForm.maxPlayers ? parseInt(eventForm.maxPlayers, 10) : null,
      }
      if (editingEvent) {
        const updated = await api.patch<Event>(`/events/${editingEvent.id}`, payload)
        setEvents(es => es.map(ev => ev.id === updated.id ? updated : ev))
      } else {
        const created = await api.post<Event>('/events', payload)
        setEvents(es => [created, ...es])
      }
      setShowEventForm(false)
      setEditingEvent(null)
    } catch {
      setEventError('Failed to save event. Please try again.')
    } finally {
      setSavingEvent(false)
    }
  }

  async function handleTransition(event: Event, action: 'publish' | 'archive') {
    setTransitioningId(event.id)
    try {
      const updated = await api.post<Event>(`/events/${event.id}/${action}`, {})
      setEvents(es => es.map(ev => ev.id === updated.id ? updated : ev))
    } catch {
      setError(`Failed to ${action} event.`)
    } finally {
      setTransitioningId(null)
    }
  }

  if (!user) return null

  const roleBadge: Record<string, 'default' | 'secondary' | 'outline'> = {
    owner: 'default',
    gm: 'secondary',
    player: 'outline',
  }

  const statusBadge: Record<string, 'default' | 'secondary' | 'outline'> = {
    published: 'default',
    draft: 'secondary',
    archived: 'outline',
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Admin</h1>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <Tabs defaultValue="events">
        <TabsList className="mb-6">
          <TabsTrigger value="events">Event Management</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          {!showEventForm && (
            <Button size="lg" className="mb-6 w-full sm:w-auto" onClick={openCreateForm}>
              + Create New Event
            </Button>
          )}

          {showEventForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingEvent ? 'Edit Event' : 'New Event'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={e => void handleEventSubmit(e)} className="space-y-4">
                  {eventError && <p className="text-sm text-destructive">{eventError}</p>}

                  <div className="space-y-1">
                    <Label>Event name <span className="text-destructive">*</span></Label>
                    <Input
                      value={eventForm.title}
                      onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="The Siege of Thornwall"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Tagline</Label>
                    <Input
                      value={eventForm.tagline}
                      onChange={e => setEventForm(f => ({ ...f, tagline: e.target.value }))}
                      placeholder="1–2 sentence hook"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>About this event</Label>
                    <Textarea
                      rows={8}
                      value={eventForm.description}
                      onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="2–4 paragraphs about the event"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Event start date <span className="text-destructive">*</span></Label>
                    <DatePicker
                      value={eventForm.startAt || undefined}
                      onChange={val => setEventForm(f => ({ ...f, startAt: val ?? '' }))}
                      placeholder="Pick start date"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Event end date</Label>
                    <DatePicker
                      value={eventForm.endAt || undefined}
                      onChange={val => setEventForm(f => ({ ...f, endAt: val ?? '' }))}
                      placeholder="Pick end date"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Location name + address</Label>
                    <Textarea
                      rows={2}
                      value={eventForm.location}
                      onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Key times</Label>
                    <Textarea
                      rows={3}
                      value={eventForm.keyTimes}
                      onChange={e => setEventForm(f => ({ ...f, keyTimes: e.target.value }))}
                      placeholder="Check-in, game-on, game-off, check-out"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Parking / travel / accessibility notes</Label>
                    <Textarea
                      rows={4}
                      value={eventForm.travelNotes}
                      onChange={e => setEventForm(f => ({ ...f, travelNotes: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Max players</Label>
                    <Input
                      type="number"
                      min={1}
                      value={eventForm.maxPlayers}
                      onChange={e => setEventForm(f => ({ ...f, maxPlayers: e.target.value }))}
                      placeholder="Leave blank for unlimited"
                      className="max-w-[160px]"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={savingEvent}>
                      {savingEvent ? 'Saving…' : editingEvent ? 'Save changes' : 'Create event'}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEventForm} disabled={savingEvent}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loadingEvents ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events yet. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {events.map(ev => (
                <Card key={ev.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{ev.title}</p>
                          <Badge variant={statusBadge[ev.status] ?? 'outline'}>{ev.status}</Badge>
                        </div>
                        {ev.tagline && (
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.tagline}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(ev.startAt).toLocaleDateString()}
                          {ev.endAt ? ` – ${new Date(ev.endAt).toLocaleDateString()}` : ''}
                          {ev.location ? ` · ${ev.location}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditForm(ev)}
                          disabled={transitioningId === ev.id}
                        >
                          Edit
                        </Button>
                        {ev.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => void handleTransition(ev, 'publish')}
                            disabled={transitioningId === ev.id}
                          >
                            {transitioningId === ev.id ? '…' : 'Publish'}
                          </Button>
                        )}
                        {ev.status === 'published' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleTransition(ev, 'archive')}
                            disabled={transitioningId === ev.id}
                            className="text-muted-foreground"
                          >
                            {transitioningId === ev.id ? '…' : 'Archive'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="characters">
          {loadingCharacters ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : characters.length === 0 ? (
            <p className="text-muted-foreground text-sm">No characters have been created yet.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Character</th>
                      <th className="text-left p-4 font-medium">Player</th>
                      <th className="text-left p-4 font-medium">XP</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="p-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {characters.map(c => {
                      const player = members.find(m => m.userId === c.userId)
                      return (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="p-4 font-medium">{c.name}</td>
                          <td className="p-4 text-muted-foreground">
                            {player?.displayName ?? <span className="text-xs italic">Unknown</span>}
                          </td>
                          <td className="p-4 text-muted-foreground">{c.totalXp} XP</td>
                          <td className="p-4">
                            {c.isActive
                              ? <Badge>Active</Badge>
                              : <Badge variant="outline">Inactive</Badge>}
                          </td>
                          <td className="p-4">
                            <Link
                              href={`/characters/${c.id}`}
                              className={buttonVariants({ variant: 'outline', size: 'sm' })}
                            >
                              Edit
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
        </TabsContent>

        <TabsContent value="members">
          {loadingMembers ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members yet.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Role</th>
                      <th className="text-left p-4 font-medium">Joined</th>
                      {isOwner && <th className="text-left p-4 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="p-4 font-medium">{m.displayName}</td>
                        <td className="p-4 text-muted-foreground">{m.email}</td>
                        <td className="p-4">
                          <Badge variant={roleBadge[m.role] ?? 'outline'}>{m.role}</Badge>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                        {isOwner && (
                          <td className="p-4">
                            {m.role === 'owner' ? (
                              <span className="text-muted-foreground text-xs">Cannot change</span>
                            ) : m.role === 'player' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleRoleChange(m.userId, 'gm')}
                                disabled={promoting === m.userId}
                              >
                                {promoting === m.userId ? 'Saving…' : 'Promote to GM'}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleRoleChange(m.userId, 'player')}
                                disabled={promoting === m.userId}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {promoting === m.userId ? 'Saving…' : 'Demote to Player'}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscriptions">
          {loadingSubscribers ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : subscribers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No subscribers yet.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map(s => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="p-4 font-medium">{s.displayName}</td>
                        <td className="p-4 text-muted-foreground">{s.email}</td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {new Date(s.subscribedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
