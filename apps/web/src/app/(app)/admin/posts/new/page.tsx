'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function NewPostPage() {
  const { user } = useAuth()
  const { game } = useSiteConfig()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null
  if (user.role !== 'owner' && user.role !== 'gm') return null

  if (game?.status !== 'active') {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">New Post</h1>
        <p className="text-muted-foreground">
          Posts can only be created while the LARP is active.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/posts', { title, body })
      if (game?.slug) {
        router.push(`/larps/${game.slug}`)
      } else {
        router.push('/dashboard')
      }
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
          <Button type="submit" disabled={submitting}>
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
