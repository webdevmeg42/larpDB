'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { setGameId } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { SiteConfig } from '@larpdb/shared'
import { useImageUpload } from '@/hooks/useImageUpload'
import dynamic from 'next/dynamic'
import CodexTab from '../_components/CodexTab'
import StoreTab from '../_components/StoreTab'
import BuildsTab from '../_components/BuildsTab'

const RulebookTab = dynamic(() => import('../_components/RulebookTab'), { ssr: false })

type FormState = Partial<{
  siteTitle: string
  tagline: string | null
  logoUrl: string | null
  bannerUrl: string | null
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
  const params = useParams<{ gameId: string }>()
  const { user } = useAuth()
  const { config, reload } = useSiteConfig()

  const [form, setForm] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logoUpload = useImageUpload((url) => set('logoUrl', url))
  const bannerUpload = useImageUpload((url) => set('bannerUrl', url))

  useEffect(() => {
    setGameId(params.gameId)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.gameId])

  useEffect(() => {
    if (!config) return
    setError(null)
    setForm({
      siteTitle: config.siteTitle,
      tagline: config.tagline ?? null,
      logoUrl: config.logoUrl ?? null,
      bannerUrl: config.bannerUrl ?? null,
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

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.patch<SiteConfig>('/config', form)
      reload()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <Link
        href="/admin/site-config"
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
          <form onSubmit={handleSave} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Site title</Label>
                  <Input value={form.siteTitle ?? ''} onChange={e => set('siteTitle', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Tagline</Label>
                  <Input value={form.tagline ?? ''} onChange={e => set('tagline', e.target.value || null)} placeholder="Optional" />
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Colors</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {(
                  [
                    ['colorPrimary', 'Primary'],
                    ['colorSecondary', 'Secondary'],
                    ['colorBackground', 'Background'],
                    ['colorText', 'Text'],
                    ['colorAccent', 'Accent'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form[key] ?? '#000000'}
                        onChange={e => set(key, e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border"
                      />
                      <Input
                        value={form[key] ?? ''}
                        onChange={e => set(key, e.target.value)}
                        placeholder="#000000"
                        className="font-mono"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Typography</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Heading font (Google Fonts name)</Label>
                  <Input value={form.fontHeading ?? ''} onChange={e => set('fontHeading', e.target.value)} placeholder="Cinzel" />
                </div>
                <div className="space-y-1">
                  <Label>Body font (Google Fonts name)</Label>
                  <Input value={form.fontBody ?? ''} onChange={e => set('fontBody', e.target.value)} placeholder="Inter" />
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
                  />
                </div>
                <div className="space-y-1">
                  <Label>Footer text</Label>
                  <Input value={form.footerText ?? ''} onChange={e => set('footerText', e.target.value || null)} />
                </div>
                <div className="space-y-1">
                  <Label>Custom CSS</Label>
                  <Textarea
                    value={form.customCss ?? ''}
                    onChange={e => set('customCss', e.target.value || null)}
                    rows={6}
                    className="font-mono text-xs"
                    placeholder="/* custom styles */"
                  />
                </div>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={saving || logoUpload.uploading || bannerUpload.uploading}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
            </Button>
          </form>
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
          <BuildsTab type="race" />
        </TabsContent>

        <TabsContent value="class-builds">
          <BuildsTab type="class" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
