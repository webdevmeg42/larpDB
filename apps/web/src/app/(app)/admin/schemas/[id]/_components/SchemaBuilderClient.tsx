'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { SchemaBuilder } from '@/components/schema-builder/SchemaBuilder'
import type { CharacterSchema, SchemaField, Faction, SiteConfig } from '@plotrunner/shared'

interface Props {
  initialSchema: CharacterSchema
}

export function SchemaBuilderClient({ initialSchema }: Props) {
  const { user } = useAuth()
  const [schema, setSchema] = useState<CharacterSchema>(initialSchema)
  const [isSaving, setIsSaving] = useState(false)
  const [codexFactions, setCodexFactions] = useState<Faction[]>([])

  useEffect(() => {
    api.get<SiteConfig>('/config')
      .then(cfg => setCodexFactions(cfg.codex?.factions ?? []))
      .catch(() => {})
  }, [])

  async function handleSave(name: string, fields: SchemaField[]) {
    setIsSaving(true)
    try {
      const updated = await api.patch<CharacterSchema>(
        `/character-schemas/${schema.id}`,
        { name, fields },
      )
      setSchema(updated)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleActivate() {
    const updated = await api.post<CharacterSchema>(`/character-schemas/${schema.id}/activate`)
    setSchema(updated)
  }

  return (
    <div className="h-full flex flex-col">
      <SchemaBuilder
        schemaId={schema.id}
        initialName={schema.name}
        initialFields={schema.fields}
        schemaType={schema.type}
        onSave={handleSave}
        onActivate={handleActivate}
        isActive={schema.isActive}
        isSaving={isSaving}
        codexFactions={codexFactions}
      />
    </div>
  )
}
