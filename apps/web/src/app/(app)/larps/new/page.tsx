'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getErrorMessage, cn } from '@/lib/utils'
import { setGameId } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Game, SiteConfig } from '@larpdb/shared'

type NewFormState = {
  siteTitle: string
  tagline: string
  isPublic: boolean
  logoUrl: string | null
  bannerUrl: string | null
  showDirectory: boolean
}

export default function NewLarpPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<NewFormState>({
    siteTitle: '',
    tagline: '',
    isPublic: true,
    logoUrl: null,
    bannerUrl: null,
    showDirectory: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState(false)

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }

  function set<K extends keyof NewFormState>(key: K, value: NewFormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'siteTitle') setTitleError(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.siteTitle.trim()) {
      setTitleError(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const newGame = await api.post<Game>('/games', {
        name: form.siteTitle.trim(),
        isPublic: form.isPublic,
      })
      setGameId(newGame.id)
      try {
        await api.patch<SiteConfig>('/config', {
          siteTitle: form.siteTitle.trim(),
          tagline: form.tagline || null,
          logoUrl: form.logoUrl,
          bannerUrl: form.bannerUrl,
          showDirectory: form.showDirectory,
        })
      } catch {
        // PATCH /config failure is non-blocking — game exists, redirect to builder
      }
      router.replace(`/larps/${newGame.id}/edit`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create LARP'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      <Link
        href="/larps"
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
      >
        ← Back to LARP Builder
      </Link>
      <h1 className="text-2xl font-semibold mb-6">Build New LARP</h1>

      <form onSubmit={e => void handleSave(e)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>LARP Name <span className="text-destructive">*</span></Label>
              <Input
                data-testid="larp-name-input"
                value={form.siteTitle}
                onChange={e => set('siteTitle', e.target.value)}
                maxLength={150}
                placeholder="Realm of Shadows"
                className={titleError ? 'border-destructive' : ''}
              />
              {titleError && <p data-testid="larp-name-error" className="text-xs text-destructive">LARP Name is required</p>}
              {(() => {
                const len = form.siteTitle.length
                return (
                  <p className={`text-xs text-right ${len >= 150 ? 'text-destructive' : len >= 130 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {len} / 150
                  </p>
                )
              })()}
            </div>
            <div className="space-y-1">
              <Label>Tagline</Label>
              <Input
                value={form.tagline}
                onChange={e => set('tagline', e.target.value)}
                maxLength={150}
              />
              {(() => {
                const len = form.tagline.length
                return (
                  <p className={`text-xs text-right ${len >= 150 ? 'text-destructive' : len >= 130 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {len} / 150
                  </p>
                )
              })()}
            </div>
            <div className="space-y-1">
              <Label>Visibility</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('isPublic', true)}
                  className={cn(
                    'px-3 py-1 rounded text-sm border',
                    form.isPublic
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input text-muted-foreground hover:text-foreground',
                  )}
                >
                  Public
                </button>
                <button
                  data-testid="visibility-private-btn"
                  type="button"
                  onClick={() => set('isPublic', false)}
                  className={cn(
                    'px-3 py-1 rounded text-sm border',
                    !form.isPublic
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input text-muted-foreground hover:text-foreground',
                  )}
                >
                  Private
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  value={form.logoUrl ?? ''}
                  onChange={e => set('logoUrl', e.target.value || null)}
                  placeholder="https://…"
                />
                <Button type="button" variant="outline" disabled>
                  Upload
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Banner URL</Label>
              <div className="flex gap-2">
                <Input
                  value={form.bannerUrl ?? ''}
                  onChange={e => set('bannerUrl', e.target.value || null)}
                  placeholder="https://…"
                />
                <Button type="button" variant="outline" disabled>
                  Upload
                </Button>
              </div>
            </div>
            <div className="pt-4 border-t space-y-2">
              <Label className="text-sm font-medium">Landing Page</Label>
              <div className="flex items-center gap-3">
                <input
                  id="show-directory"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.showDirectory}
                  onChange={e => set('showDirectory', e.target.checked)}
                />
                <label htmlFor="show-directory" className="text-sm">
                  Show Directory to the public
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                When on, visitors who haven't joined can see links to the Codex, Rulebook, Store, and Builds pages. When off, only members see the directory.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={saving}
        >
          {saving ? 'Creating…' : 'Create LARP'}
        </Button>
      </form>
    </div>
  )
}
