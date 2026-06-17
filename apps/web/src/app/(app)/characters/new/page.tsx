'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { api } from '@/lib/api'
import { CharacterForm } from '@/components/character/CharacterForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CharacterSchema, Character } from '@larpdb/shared'

export default function NewCharacterPage() {
  const { user } = useAuth()
  const { game } = useSiteConfig()
  const router = useRouter()
  const [schema, setSchema] = useState<CharacterSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    api.get<CharacterSchema[]>('/character-schemas')
      .then(schemas => {
        const active = schemas.find(s => s.isActive)
        setSchema(active ?? null)
      })
      .catch(() => setFetchError('Failed to load schema. Please refresh.'))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return null
  if (game?.status === 'inactive') {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-muted-foreground">
          This LARP is currently inactive. Characters cannot be created until it&apos;s reactivated.
        </p>
      </div>
    )
  }
  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (fetchError) return <div className="p-6 text-sm text-destructive">{fetchError}</div>
  if (!schema) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-muted-foreground">
          No character schema has been activated yet. Ask your GM to set one up.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Character name is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const character = await api.post<Character>('/characters', { name: name.trim(), data: values })
      router.push(`/characters/${character.id}`)
    } catch {
      setError('Failed to create character. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">New Character</h1>
      <form onSubmit={e => void handleSubmit(e)} className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="name">
            Character name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter character name…"
          />
        </div>
        {schema.fields.length > 0 && (
          <CharacterForm
            fields={schema.fields}
            values={values}
            onChange={setValues}
            mode="create"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create character'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/characters')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
