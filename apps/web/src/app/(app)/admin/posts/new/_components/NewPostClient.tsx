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
import type { MyGame } from '@plotrunner/shared'

type MediaMode = 'photo' | 'video'

interface Draft {
  id: string
  title: string
  body: string
  gameId: string
  gameName: string
  mediaType: 'photo' | 'video' | null
  mediaUrls: string[] | null
  updatedAt: string
}

interface Props {
  initialGames: MyGame[]
  initialGameId: string | null
  initialDrafts: Draft[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function NewPostClient({ initialGames, initialGameId, initialDrafts }: Props) {
  const { user } = useAuth()
  const router = useRouter()

  const [games] = useState<MyGame[]>(initialGames)
  const [selectedGameId, setSelectedGameId] = useState(initialGameId ?? '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mediaMode, setMediaMode] = useState<MediaMode>('photo')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState(false)

  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  if (!user) return null
  if (user.role !== 'owner' && user.role !== 'gm') return null

  if (games.length === 0) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">New Post</h1>
        <p className="text-muted-foreground">
          You have no active Adventures to post to. An Adventure must be set to active before you can publish posts.
        </p>
      </div>
    )
  }

  async function uploadFile(file: File): Promise<string | null> {
    if (!selectedGameId) return null
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Game-Id': selectedGameId },
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
      setIsDirty(true)
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
        setIsDirty(true)
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
    setIsDirty(true)
  }

  function handleGameChange(gameId: string) {
    setSelectedGameId(gameId)
    setGameId(gameId)
    if (draftId) setDraftId(null)
    setIsDirty(title.trim() !== '' || body.trim() !== '')
  }

  function resumeDraft(draft: Draft) {
    setTitle(draft.title)
    setBody(draft.body)
    setSelectedGameId(draft.gameId)
    setGameId(draft.gameId)
    setMediaMode((draft.mediaType as MediaMode) ?? 'photo')
    setPhotoUrls(draft.mediaType === 'photo' ? (draft.mediaUrls ?? []) : [])
    setVideoUrl(draft.mediaType === 'video' ? (draft.mediaUrls?.[0] ?? null) : null)
    setDraftId(draft.id)
    setIsDirty(false)
    setDraftSaved(false)
  }

  async function handleDeleteDraft(draft: Draft) {
    const prevGameId = selectedGameId
    setGameId(draft.gameId)
    try {
      await api.delete(`/posts/${draft.id}`)
      setDrafts(prev => prev.filter(d => d.id !== draft.id))
      if (draftId === draft.id) setDraftId(null)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to delete draft')
    } finally {
      setGameId(prevGameId)
    }
  }

  async function handleSaveDraft() {
    if (!selectedGameId) return
    if (!title.trim()) { setTitleError(true); return }
    setSavingDraft(true)
    setError(null)
    try {
      setGameId(selectedGameId)
      const hasMedia = mediaMode === 'photo' ? photoUrls.length > 0 : videoUrl !== null
      const mediaPayload = hasMedia
        ? { mediaType: mediaMode, mediaUrls: mediaMode === 'photo' ? photoUrls : [videoUrl!] }
        : {}

      if (draftId) {
        await api.patch(`/posts/${draftId}`, { title, body, ...mediaPayload })
      } else {
        const created = await api.post<Draft>('/posts', {
          title, body, ...mediaPayload, status: 'draft',
        })
        setDraftId(created.id)
        setDrafts(prev => [created, ...prev])
      }
      setIsDirty(false)
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to save draft')
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGameId) return
    if (!title.trim()) { setTitleError(true); return }
    setSubmitting(true)
    setError(null)
    try {
      setGameId(selectedGameId)
      const hasMedia = mediaMode === 'photo' ? photoUrls.length > 0 : videoUrl !== null
      const mediaPayload = hasMedia
        ? { mediaType: mediaMode, mediaUrls: mediaMode === 'photo' ? photoUrls : [videoUrl!] }
        : {}

      if (draftId) {
        await api.patch(`/posts/${draftId}`, { title, body, ...mediaPayload, status: 'published' })
      } else {
        await api.post('/posts', { title, body, ...mediaPayload })
      }
      const selected = games.find(g => g.id === selectedGameId)
      router.push(selected ? `/adventures/${selected.slug}` : '/dashboard')
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create post')
      setSubmitting(false)
    }
  }

  const isUploading = uploading > 0

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">New Post</h1>

      {drafts.length > 0 && !draftId && (
        <div className="mb-6 rounded-lg border p-4 space-y-2" data-testid="draft-list">
          <p className="text-sm font-medium">Your drafts</p>
          {drafts.map(draft => (
            <div key={draft.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate flex-1">
                {draft.title}
                {' · '}
                <span className="text-muted-foreground">{draft.gameName}</span>
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  data-testid="draft-resume-btn"
                  onClick={() => resumeDraft(draft)}
                  className="text-primary hover:underline"
                >
                  Resume
                </button>
                <button
                  type="button"
                  data-testid="draft-delete-btn"
                  onClick={() => handleDeleteDraft(draft)}
                  className="text-destructive hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {games.length > 1 && !selectedGameId && (
          <div className="space-y-1.5">
            <Label htmlFor="adventure">Adventure</Label>
            <select
              id="adventure"
              value={selectedGameId}
              onChange={e => handleGameChange(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select an Adventure…</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={e => { setTitle(e.target.value); setTitleError(false); setIsDirty(true) }}
            placeholder="Post title"
          />
          {titleError && <p data-testid="post-title-error" className="text-xs text-destructive">Title is required</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            value={body}
            onChange={e => { setBody(e.target.value); setIsDirty(true) }}
            placeholder="What&apos;s happening?"
            rows={10}
          />
        </div>

        <fieldset className="border-none p-0 m-0 space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium">
              Media <span className="text-muted-foreground font-normal">(optional)</span>
            </legend>
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
                        onClick={() => { setPhotoUrls(prev => prev.filter((_, j) => j !== i)); setIsDirty(true) }}
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
                    onClick={() => { setVideoUrl(null); setIsDirty(true) }}
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !selectedGameId || isUploading}>
            {isUploading ? 'Uploading…' : submitting ? 'Publishing…' : 'Publish'}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="save-draft-btn"
            disabled={savingDraft || !selectedGameId || isUploading}
            onClick={handleSaveDraft}
          >
            {savingDraft ? 'Saving…' : draftSaved ? 'Draft saved!' : 'Save Draft'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return
              router.back()
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
