'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { SchemaBuilder } from '@/components/schema-builder/SchemaBuilder'
import type { CharacterSchema, SchemaField } from '@larpdb/shared'

export default function SchemaBuilderPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [schema, setSchema] = useState<CharacterSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    api.get<CharacterSchema>(`/character-schemas/${params.id}`)
      .then(setSchema)
      .catch(() => router.push('/larps'))
      .finally(() => setLoading(false))
  }, [user, params.id, router])

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }
  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (!schema) return null

  async function handleSave(name: string, fields: SchemaField[]) {
    setIsSaving(true)
    try {
      const updated = await api.patch<CharacterSchema>(
        `/character-schemas/${params.id}`,
        { name, fields },
      )
      setSchema(updated)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleActivate() {
    if (!schema) return
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
      />
    </div>
  )
}
