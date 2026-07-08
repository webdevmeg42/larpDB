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

interface MyGame {
  id: string
  name: string
  slug: string
  status: string
  role: string
}

interface Npc {
  id: string
  name: string
}

export default function NewNpcPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [gameName, setGameName] = useState<string | null>(null)
  const [selectedGameId, setSelectedGameId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const gameId = getGameId()
    if (!gameId) {
      router.replace('/admin/community')
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
    if (!selectedGameId || !name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      setGameId(selectedGameId)
      const npc = await api.post<Npc>('/npcs', {
        name: name.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
      })
      router.push(`/npcs/${npc.id}`)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create NPC')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New NPC</h1>
        {gameName && <p className="text-sm text-muted-foreground mt-1">{gameName}</p>}
      </div>
      <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="npc-name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="npc-name"
            data-testid="npc-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Lord Blackwood"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="npc-description">Description</Label>
          <Textarea
            id="npc-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description visible to players…"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="npc-notes">GM Notes</Label>
          <Textarea
            id="npc-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Private notes for GMs only…"
            rows={4}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button
            data-testid="create-npc-btn"
            type="submit"
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Creating…' : 'Create NPC'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
