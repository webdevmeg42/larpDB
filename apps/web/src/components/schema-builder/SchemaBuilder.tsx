'use client'

import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { FieldList } from './FieldList'
import { FieldPalette } from './FieldPalette'
import { FieldEditor } from './FieldEditor'
import { SchemaPreview } from './SchemaPreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { SchemaField, SchemaFieldType } from '@larpdb/shared'
import { getErrorMessage } from '@/lib/utils'

function makeDefaultField(type: SchemaFieldType, order: number): SchemaField {
  const base = { id: uuidv4(), label: '', type, required: false, order }
  switch (type) {
    case 'select':
    case 'multiselect':
      return { ...base, options: [] } as SchemaField
    case 'number':
      return { ...base } as SchemaField
    case 'statblock':
      return { ...base, stats: [] } as SchemaField
    default:
      return base as SchemaField
  }
}

interface SchemaBuilderProps {
  schemaId: string
  initialName: string
  initialFields: SchemaField[]
  onSave: (name: string, fields: SchemaField[]) => Promise<void>
  onActivate: () => Promise<void>
  isActive: boolean
  isSaving: boolean
}

export function SchemaBuilder({
  schemaId: _schemaId,
  initialName,
  initialFields,
  onSave,
  onActivate,
  isActive,
  isSaving,
}: SchemaBuilderProps) {
  const [name, setName] = useState(initialName)
  const [fields, setFields] = useState<SchemaField[]>(initialFields)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectedField = fields.find(f => f.id === selectedId) ?? null

  const addField = useCallback((type: SchemaFieldType) => {
    const field = makeDefaultField(type, fields.length)
    setFields(prev => [...prev, field])
    setSelectedId(field.id)
  }, [fields.length])

  const updateField = useCallback((updated: SchemaField) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f))
  }, [])

  const deleteField = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
    setSelectedId(s => s === id ? null : s)
  }, [])

  const reorderFields = useCallback((reordered: SchemaField[]) => {
    setFields(reordered.map((f, i) => ({ ...f, order: i } as SchemaField)))
  }, [])

  async function handleSave() {
    setSaveError(null)
    try {
      await onSave(name, fields.map((f, i) => ({ ...f, order: i } as SchemaField)))
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, 'Save failed'))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b px-6 py-3">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          className="max-w-xs font-medium"
          placeholder="Schema name"
        />
        <div className="ml-auto flex gap-2">
          {saveError && <span className="text-sm text-destructive">{saveError}</span>}
          {!isActive && (
            <Button variant="outline" onClick={() => void onActivate()} disabled={isSaving}>
              Activate
            </Button>
          )}
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-44 shrink-0 border-r p-3 overflow-y-auto">
          <FieldPalette onAdd={addField} />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="fields">
            <TabsList className="mb-4">
              <TabsTrigger value="fields">Fields ({fields.length})</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="fields">
              <FieldList
                fields={fields}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onReorder={reorderFields}
                onDelete={deleteField}
              />
            </TabsContent>
            <TabsContent value="preview">
              <SchemaPreview fields={fields} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-72 shrink-0 border-l overflow-y-auto">
          {selectedField ? (
            <FieldEditor field={selectedField} onChange={updateField} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4 text-center">
              Select a field to edit its properties
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
