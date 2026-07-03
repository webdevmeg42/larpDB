'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { api } from '@/lib/api'
import { getErrorMessage, cn } from '@/lib/utils'
import { setGameId } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { SiteConfig, GameCodex, Game } from '@larpdb/shared'
import { useImageUpload } from '@/hooks/useImageUpload'
import dynamic from 'next/dynamic'
import CodexTab, { BrandingSection, type BrandingSectionRef } from '../../_components/CodexTab'
import StoreTab from '../../_components/StoreTab'
import BuildsTab from '../../_components/BuildsTab'

const RulebookTab = dynamic(() => import('../../_components/RulebookTab'), { ssr: false })

type FormState = Partial<{
  siteTitle: string
  tagline: string | null
  themeName: string | null
  logoUrl: string | null
  bannerUrl: string | null
  showDirectory: boolean
  colorPrimary: string
  colorSecondary: string
  colorBackground: string
  colorText: string
  colorAccent: string
  fontHeading: string
  fontBody: string
  welcomeMessage: string | null
  footerText: string | null
  customCss: string | null
}>

export default function BuilderPage() {
  const params = useParams<{ slug: string }>()
  const { user } = useAuth()
  const { config, game, reload } = useSiteConfig()

  const [form, setForm] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isPublic, setIsPublic] = useState<boolean | null>(null)

  const logoUpload = useImageUpload((url) => set('logoUrl', url))
  const bannerUpload = useImageUpload((url) => set('bannerUrl', url))
  const brandingRef = useRef<BrandingSectionRef>(null)

  useEffect(() => {
    setGameId(params.slug)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug])

  useEffect(() => {
    if (!config) return
    setError(null)
    setForm({
      siteTitle: config.siteTitle,
      tagline: config.tagline ?? null,
      themeName: config.themeName ?? null,
      logoUrl: config.logoUrl ?? null,
      bannerUrl: config.bannerUrl ?? null,
      showDirectory: config.showDirectory ?? false,
      colorPrimary: config.colorPrimary,
      colorSecondary: config.colorSecondary,
      colorBackground: config.colorBackground,
      colorText: config.colorText,
      colorAccent: config.colorAccent,
      fontHeading: config.fontHeading,
      fontBody: config.fontBody,
      welcomeMessage: config.welcomeMessage ?? null,
      footerText: config.footerText ?? null,
      customCss: config.customCss ?? null,
    })
  }, [config])

  useEffect(() => {
    if (game === null) return
    setIsPublic(game.isPublic)
  }, [game])

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    if (validationErrors[key]) {
      setValidationErrors(e => { const next = { ...e }; delete next[key]; return next })
    }
  }

  async function saveCodexSection(updates: Partial<GameCodex>) {
    const merged = { ...(config?.codex ?? {}), ...updates }
    await api.patch<SiteConfig>('/config', { codex: merged })
    reload()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!form.siteTitle?.trim()) errors.siteTitle = 'LARP Name is required'
    if (!form.tagline?.trim()) errors.tagline = 'Tagline is required'
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await Promise.all([
        api.patch<SiteConfig>('/config', form),
        ...(isPublic !== null ? [api.patch<Game>(`/games/${params.slug}`, { isPublic })] : []),
      ])
      if (brandingRef.current) {
        const socialData = brandingRef.current.getData()
        await saveCodexSection(socialData)
      } else {
        reload()
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Save failed'))
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
      <h1 className="text-2xl font-semibold mb-6">LARP Builder</h1>

      <Tabs defaultValue="branding">
        <TabsList className="mb-6">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="codex">The Codex</TabsTrigger>
          <TabsTrigger value="rulebook">Rulebook</TabsTrigger>
          <TabsTrigger value="store">The Store</TabsTrigger>
          <TabsTrigger value="race-builds">Race Builds</TabsTrigger>
          <TabsTrigger value="class-builds">Class Builds</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <div className="space-y-6">
              <form id="branding-form" onSubmit={handleSave} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>LARP Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.siteTitle ?? ''}
                    onChange={e => set('siteTitle', e.target.value)}
                    maxLength={150}
                    className={validationErrors.siteTitle ? 'border-destructive' : ''}
                  />
                  {validationErrors.siteTitle && (
                    <p className="text-xs text-destructive">{validationErrors.siteTitle}</p>
                  )}
                  {(() => {
                    const len = (form.siteTitle ?? '').length
                    return (
                      <p className={`text-xs text-right ${len >= 150 ? 'text-destructive' : len >= 130 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {len} / 150
                      </p>
                    )
                  })()}
                </div>
                <div className="space-y-1">
                  <Label>Tagline <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.tagline ?? ''}
                    onChange={e => set('tagline', e.target.value || null)}
                    maxLength={150}
                    className={validationErrors.tagline ? 'border-destructive' : ''}
                  />
                  {validationErrors.tagline && (
                    <p data-testid="tagline-error" className="text-xs text-destructive">{validationErrors.tagline}</p>
                  )}
                  {(() => {
                    const len = (form.tagline ?? '').length
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
                      onClick={() => setIsPublic(true)}
                      className={cn(
                        'px-3 py-1 rounded text-sm border',
                        isPublic === true
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-input text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={cn(
                        'px-3 py-1 rounded text-sm border',
                        isPublic === false
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
                    <Input value={form.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value || null)} placeholder="https://…" />
                    <Button type="button" variant="outline" onClick={logoUpload.trigger} disabled={logoUpload.uploading}>
                      {logoUpload.uploading ? 'Uploading…' : 'Upload'}
                    </Button>
                    <input
                      ref={logoUpload.inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) logoUpload.handleFile(f); e.target.value = '' }}
                    />
                  </div>
                  {logoUpload.error && <p className="text-sm text-destructive">{logoUpload.error}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Banner URL</Label>
                  <div className="flex gap-2">
                    <Input value={form.bannerUrl ?? ''} onChange={e => set('bannerUrl', e.target.value || null)} placeholder="https://…" />
                    <Button type="button" variant="outline" onClick={bannerUpload.trigger} disabled={bannerUpload.uploading}>
                      {bannerUpload.uploading ? 'Uploading…' : 'Upload'}
                    </Button>
                    <input
                      ref={bannerUpload.inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) bannerUpload.handleFile(f); e.target.value = '' }}
                    />
                  </div>
                  {bannerUpload.error && <p className="text-sm text-destructive">{bannerUpload.error}</p>}
                </div>
                <div className="pt-4 border-t space-y-2">
                  <Label className="text-sm font-medium">Landing Page</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="show-directory"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.showDirectory ?? false}
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

            <Card>
              <CardHeader><CardTitle>Content</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Welcome message</Label>
                  <Textarea
                    value={form.welcomeMessage ?? ''}
                    onChange={e => set('welcomeMessage', e.target.value || null)}
                    rows={4}
                    placeholder="Displayed on the player dashboard"
                    maxLength={1000}
                  />
                  {(() => {
                    const len = (form.welcomeMessage ?? '').length
                    return (
                      <p className={`text-xs text-right ${len >= 1000 ? 'text-destructive' : len >= 900 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {len} / 1000
                      </p>
                    )
                  })()}
                </div>
                <div className="space-y-1">
                  <Label>Footer text</Label>
                  <Input value={form.footerText ?? ''} onChange={e => set('footerText', e.target.value || null)} />
                </div>

              </CardContent>
            </Card>

              </form>
              <BrandingSection ref={brandingRef} codex={config?.codex ?? {}} />
              {Object.keys(validationErrors).length > 0 && (
                <p data-testid="form-error-banner" className="text-sm text-destructive">
                  Please fill out the following required fields:{' '}
                  {Object.keys(validationErrors)
                    .map(k => ({ siteTitle: 'LARP Name', tagline: 'Tagline' })[k] ?? k)
                    .join(', ')}
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                form="branding-form"
                disabled={saving || logoUpload.uploading || bannerUpload.uploading}
              >
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
              </Button>
          </div>
        </TabsContent>

        <TabsContent value="codex">
          <CodexTab config={config} reload={reload} />
        </TabsContent>

        <TabsContent value="rulebook">
          <RulebookTab config={config} reload={reload} />
        </TabsContent>

        <TabsContent value="store">
          <StoreTab config={config} reload={reload} />
        </TabsContent>

        <TabsContent value="race-builds">
          <BuildsTab type="race" hasLevelingSystem={!!config?.codex?.levelingSystem} />
        </TabsContent>

        <TabsContent value="class-builds">
          <BuildsTab type="class" hasLevelingSystem={!!config?.codex?.levelingSystem} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
