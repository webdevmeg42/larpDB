'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SchemaTemplate, CharacterSchema } from '@larpdb/shared'

export default function NewSchemaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<SchemaTemplate[]>([])
  const [selected, setSelected] = useState<SchemaTemplate | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<SchemaTemplate[]>('/schema-templates').then(setTemplates)
  }, [])

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const schema = await api.post<CharacterSchema>('/character-schemas', {
        name: name.trim(),
        fields: selected ? selected.fields : [],
        templateSource: selected ? selected.id : null,
      })
      router.push(`/admin/schemas/${schema.id}`)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create schema'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">New Character Schema</h1>
      <p className="text-muted-foreground mb-6">Start from a genre template or blank.</p>

      <div className="space-y-6">
        <div className="space-y-1">
          <Label>Schema name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Fantasy Adventure v1"
            className="max-w-sm"
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-3">Start from template (optional)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card
              className={`cursor-pointer transition-colors ${!selected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => setSelected(null)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Blank</CardTitle>
                <CardDescription className="text-xs">Start with no fields</CardDescription>
              </CardHeader>
            </Card>
            {templates.map(t => (
              <Card
                key={t.id}
                className={`cursor-pointer transition-colors ${selected?.id === t.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                onClick={() => setSelected(t)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{t.name}</CardTitle>
                  <CardDescription className="text-xs">{t.description ?? t.genre} · {t.fields.length} fields</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={() => void handleCreate()} disabled={!name.trim() || creating}>
          {creating ? 'Creating…' : 'Create schema'}
        </Button>
      </div>
    </div>
  )
}
