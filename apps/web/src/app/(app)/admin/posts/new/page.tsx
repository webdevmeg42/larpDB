'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { setGameId } from '@/lib/auth'
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

export default function NewPostPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [games, setGames] = useState<MyGame[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<MyGame[]>('/my-games')
      .then(all => {
        const active = all.filter(
          g => g.status === 'active' && (g.role === 'owner' || g.role === 'gm'),
        )
        setGames(active)
        if (active.length === 1 && active[0]) setSelectedGameId(active[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!user) return null
  if (user.role !== 'owner' && user.role !== 'gm') return null

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  if (games.length === 0) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">New Post</h1>
        <p className="text-muted-foreground">
          You have no active LARPs to post to. A LARP must be set to active before you can publish posts.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGameId || !title.trim() || !body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      setGameId(selectedGameId)
      await api.post('/posts', { title, body })
      const selected = games.find(g => g.id === selectedGameId)
      router.push(selected ? `/larps/${selected.slug}` : '/dashboard')
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create post')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">New Post</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="larp">LARP</Label>
          <select
            id="larp"
            value={selectedGameId}
            onChange={e => setSelectedGameId(e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {games.length > 1 && <option value="">Select a LARP…</option>}
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What's happening?"
            rows={10}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !selectedGameId}>
            {submitting ? 'Publishing…' : 'Publish'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
