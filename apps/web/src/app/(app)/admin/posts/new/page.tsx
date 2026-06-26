'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { setGameId, getToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type MediaMode = 'photo' | 'video'

interface MyGame {
  id: string
  name: string
  slug: string
  status: string
  role: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function NewPostPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [games, setGames] = useState<MyGame[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mediaMode, setMediaMode] = useState<MediaMode>('photo')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
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
  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>

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

  async function uploadFile(file: File): Promise<string | null> {
    const token = getToken()
    if (!token || !selectedGameId) return null
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Game-Id': selectedGameId },
      body: fd,
    })
    if (!res.ok) return null
    const { url } = await res.json() as { url: string }
    return `${API_BASE}${url}`
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const batch = files.slice(0, 8 - photoUrls.length)
    setUploading(u => u + batch.length)
    try {
      const results = await Promise.all(batch.map(uploadFile))
      const urls = results.filter((u): u is string => u !== null)
      if (urls.length < batch.length) {
        setError(`${batch.length - urls.length} photo(s) failed to upload — please try again.`)
      }
      setPhotoUrls(prev => [...prev, ...urls])
    } catch {
      setError('Upload failed — please try again.')
    } finally {
      setUploading(u => u - batch.length)
      e.target.value = ''
    }
  }

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(u => u + 1)
    try {
      const url = await uploadFile(file)
      if (url) {
        setVideoUrl(url)
      } else {
        setError('Video upload failed — please try again.')
      }
    } catch {
      setError('Upload failed — please try again.')
    } finally {
      setUploading(u => u - 1)
      e.target.value = ''
    }
  }

  function switchMode(mode: MediaMode) {
    setMediaMode(mode)
    setPhotoUrls([])
    setVideoUrl(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGameId || !title.trim() || !body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      setGameId(selectedGameId)
      const hasMedia = mediaMode === 'photo' ? photoUrls.length > 0 : videoUrl !== null
      const mediaPayload = hasMedia
        ? { mediaType: mediaMode, mediaUrls: mediaMode === 'photo' ? photoUrls : [videoUrl!] }
        : {}
      await api.post('/posts', { title, body, ...mediaPayload })
      const selected = games.find(g => g.id === selectedGameId)
      router.push(selected ? `/larps/${selected.slug}` : '/dashboard')
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create post')
      setSubmitting(false)
    }
  }

  const isUploading = uploading > 0

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

        {/* Media section */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Media <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="flex gap-1 rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => switchMode('photo')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  mediaMode === 'photo'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Photos
              </button>
              <button
                type="button"
                onClick={() => switchMode('video')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  mediaMode === 'video'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Video
              </button>
            </div>
          </div>

          {mediaMode === 'photo' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={photoUrls.length >= 8 || isUploading || !selectedGameId}
                  onChange={handlePhotoSelect}
                  className="text-sm"
                />
                <span className="text-xs text-muted-foreground">{photoUrls.length} / 8</span>
              </div>
              {photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photoUrls.map((url, i) => (
                    <div key={url} className="relative">
                      <img src={url} alt="" className="h-16 w-16 rounded object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrls(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mediaMode === 'video' && (
            <div className="space-y-2">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                disabled={videoUrl !== null || isUploading || !selectedGameId}
                onChange={handleVideoSelect}
                className="text-sm"
              />
              {videoUrl && (
                <div className="relative inline-block">
                  <video src={videoUrl} controls preload="metadata" className="max-h-48 rounded" />
                  <button
                    type="button"
                    onClick={() => setVideoUrl(null)}
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !selectedGameId || isUploading}>
            {isUploading ? 'Uploading…' : submitting ? 'Publishing…' : 'Publish'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
