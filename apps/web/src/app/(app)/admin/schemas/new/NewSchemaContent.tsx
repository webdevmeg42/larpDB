'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SchemaBuilder } from '@/components/schema-builder/SchemaBuilder'
import type { SchemaTemplate, CharacterSchema, SchemaField } from '@larpdb/shared'

export default function NewSchemaContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const schemaType = (searchParams.get('type') === 'class' ? 'class' : 'race') as 'race' | 'class'
  const [templates, setTemplates] = useState<SchemaTemplate[]>([])
  const [selected, setSelected] = useState<SchemaTemplate | null>(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [building, setBuilding] = useState(false)
  const [initialFields, setInitialFields] = useState<SchemaField[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    api.get<SchemaTemplate[]>(`/schema-templates?type=${schemaType}`)
      .then(setTemplates)
      .catch(() => {})
  }, [schemaType])

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }

  function handleStartBuilding() {
    if (!name.trim()) return
    const rawFields = selected ? selected.fields : []
    const fields = rawFields.filter(f => {
      if (f.type === 'statblock' && f.label === 'Core Stats') return false
      if (schemaType === 'race' && f.type === 'statblock') return false
      if (schemaType === 'race' && f.type === 'number' && f.label.toLowerCase() === 'level') return false
      return true
    })
    setInitialFields(fields)
    setBuilding(true)
  }

  async function handleSave(savedName: string, fields: SchemaField[]) {
    setIsSaving(true)
    try {
      const schema = await api.post<CharacterSchema>('/character-schemas', {
        name: savedName.trim(),
        fields,
        templateSource: selected ? selected.id : null,
        type: schemaType,
      })
      router.push(`/admin/schemas/${schema.id}`)
      // Don't reset isSaving — keep the button disabled until navigation completes
    } catch (err) {
      setIsSaving(false)
      throw err
    }
  }

  if (building) {
    return (
      <div className="h-full flex flex-col">
        <SchemaBuilder
          schemaId=""
          initialName={name}
          initialFields={initialFields}
          schemaType={schemaType}
          onSave={handleSave}
          onActivate={async () => {}}
          isActive={false}
          isSaving={isSaving}
        />
      </div>
    )
  }

  const isRace = schemaType === 'race'

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">
        New {isRace ? 'Race' : 'Class'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {isRace
          ? 'Define the appearance options, traits, and backstory for a creature type players can choose — like Human, Elf, or Dwarf.'
          : 'Define the stat blocks, abilities, and skills for a character archetype players can build — like Wizard, Warrior, or Bard.'}
      </p>

      <div className="space-y-6">
        <div className="space-y-1">
          <Label>{isRace ? 'Race name' : 'Class name'}</Label>
          <Input
            data-testid="schema-name-input"
            value={name}
            onChange={e => { setName(e.target.value); setNameError('') }}
            placeholder={isRace ? 'e.g. Elf' : 'e.g. Wizard'}
            className="max-w-sm"
            onKeyDown={e => { if (e.key === 'Enter') handleStartBuilding() }}
          />
          {nameError && <p data-testid="schema-name-error" className="text-xs text-destructive mt-1">{nameError}</p>}
        </div>

        <div>
          <p className="text-sm font-medium mb-3">Start from template (optional)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card
              data-testid="template-card"
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
                data-testid="template-card"
                className={`cursor-pointer transition-colors ${selected?.id === t.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                onClick={() => { if (!name.trim()) { setNameError('Name is required') } setSelected(t) }}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{t.name}</CardTitle>
                  <CardDescription className="text-xs">{t.description ?? t.genre} · {t.fields.length} fields</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <Button data-testid="start-building-btn" onClick={handleStartBuilding} disabled={!name.trim()}>
          Start building
        </Button>
      </div>
    </div>
  )
}
