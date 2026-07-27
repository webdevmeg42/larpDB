'use client'

import { useState, useCallback } from 'react'
import { FieldList } from './FieldList'
import { FieldPalette } from './FieldPalette'
import { FieldEditor } from './FieldEditor'
import { SchemaPreview } from './SchemaPreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SchemaField, SchemaFieldType, CharacterSchemaType } from '@plotrunner/shared'
import { getErrorMessage } from '@/lib/utils'
import { getLockedDefaults, initLockedFields, makeDefaultField } from './_schemaBuilderUtils'

interface SchemaBuilderProps {
  schemaId: string
  initialName: string
  initialFields: SchemaField[]
  schemaType?: CharacterSchemaType
  onSave: (name: string, fields: SchemaField[]) => Promise<void>
  onActivate: () => Promise<void>
  isActive: boolean
  isSaving: boolean
}

export function SchemaBuilder({
  schemaId,
  initialName,
  initialFields,
  schemaType,
  onSave,
  onActivate,
  isActive,
  isSaving,
}: SchemaBuilderProps) {
  const [name, setName] = useState(initialName)
  const [lockedFields, setLockedFields] = useState<SchemaField[]>(() => initLockedFields(schemaType, initialFields))
  const [fields, setFields] = useState<SchemaField[]>(() => {
    const lockedDefs = getLockedDefaults(schemaType)
    return initialFields.filter(f => {
      if (f.locked) return false
      if (lockedDefs.some(def => def.type === f.type && def.label === f.label)) return false
      // Level is system-managed; owners should not define it in any schema
      if (f.type === 'number' && f.label.toLowerCase() === 'level') return false
      return true
    })
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [duplicateFieldIds, setDuplicateFieldIds] = useState<Set<string>>(new Set())

  const selectedField =
    lockedFields.find(f => f.id === selectedId) ??
    fields.find(f => f.id === selectedId) ??
    null

  const addField = useCallback((type: SchemaFieldType, defaultLabel?: string) => {
    const field = makeDefaultField(type, fields.length, defaultLabel)
    setFields(prev => [...prev, field])
    setSelectedId(field.id)
  }, [fields.length])

  const updateField = useCallback((updated: SchemaField) => {
    if (updated.locked) {
      setLockedFields(prev => prev.map(f => f.id === updated.id ? { ...updated, locked: true } : f))
    } else {
      setFields(prev => prev.map(f => f.id === updated.id ? updated : f))
    }
  }, [])

  const deleteField = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
    setSelectedId(s => s === id ? null : s)
  }, [])

  const reorderFields = useCallback((reordered: SchemaField[]) => {
    setFields(reordered.map((f, i) => ({ ...f, order: lockedFields.length + i } as SchemaField)))
  }, [lockedFields.length])

  async function handleSave() {
    setSaveError(null)
    try {
      const labelCount = new Map<string, string[]>()
      for (const f of [...lockedFields, ...fields]) {
        const key = f.label.trim().toLowerCase()
        if (!key) continue
        if (!labelCount.has(key)) labelCount.set(key, [])
        labelCount.get(key)!.push(f.id)
      }
      const dupes = new Set<string>()
      for (const ids of labelCount.values()) {
        if (ids.length > 1) ids.forEach(id => dupes.add(id))
      }
      if (dupes.size > 0) {
        setSaveAttempted(true)
        setDuplicateFieldIds(dupes)
        setSaveError('Field labels must be unique.')
        return
      }
      setDuplicateFieldIds(new Set())

      const unlabeledField = fields.find(f => !f.label.trim())
      if (unlabeledField) {
        setSaveAttempted(true)
        setSaveError('All fields must have a label before saving.')
        return
      }

      const allFields: SchemaField[] = [
        ...lockedFields.map((f, i) => ({ ...f, order: i })),
        ...fields.map((f, i) => ({ ...f, order: lockedFields.length + i })),
      ] as SchemaField[]

      if (schemaType === 'class') {
        for (const field of allFields) {
          if (field.type === 'hitpoints' && (field.hitPointEntries ?? []).length < 3) {
            setSaveError(`"${field.label}" requires at least 3 levels defined.`)
            return
          }
          if (field.type === 'statblock') {
            const statsWithEntries = (field.stats ?? []).filter(s => (s.levelEntries ?? []).length > 0)
            if (statsWithEntries.length > 0) {
              const under = statsWithEntries.find(s => (s.levelEntries ?? []).length < 3)
              if (under) {
                setSaveError(`"${field.label}" — ${under.label} requires at least 3 levels defined.`)
                return
              }
            }
          }
          if (field.type === 'attacks' && (field.attackEntries ?? []).length < 3) {
            setSaveError(`"${field.label}" requires at least 3 entries defined.`)
            return
          }
          if (field.type === 'spells' && (field.spellEntries ?? []).length < 3) {
            setSaveError(`"${field.label}" requires at least 3 entries defined.`)
            return
          }
        }
      }

      setSaveAttempted(false)
      await onSave(name, allFields)
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, 'Save failed'))
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-3 shrink-0">
        {schemaType && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-muted text-muted-foreground uppercase tracking-wide shrink-0">
            {schemaType === 'race' ? 'Race' : 'Class'}
          </span>
        )}
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          className="max-w-xs font-medium"
          placeholder="Schema name"
        />
        <div className="ml-auto flex items-center gap-2">
          {saveError && <span data-testid="schema-save-error" className="text-sm text-destructive">{saveError}</span>}
          {!isActive && !!schemaId && (
            <Button data-testid="schema-activate-btn" variant="outline" onClick={() => void onActivate()} disabled={isSaving}>
              Activate
            </Button>
          )}
          <Button data-testid="schema-save-btn" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Palette */}
        <div className="w-40 shrink-0 border-r p-3 overflow-y-auto">
          <FieldPalette onAdd={addField} {...(schemaType !== undefined ? { schemaType } : {})} />
        </div>

        {/* Center: field list (top) + live preview (bottom) */}
        <div className="flex-1 flex flex-col overflow-hidden border-r min-w-0">
          {/* Field list */}
          <div className="shrink-0 flex flex-col" style={{ maxHeight: '45%' }}>
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fields</p>
              {(lockedFields.length + fields.length) > 0 && (
                <span className="text-xs text-muted-foreground">({lockedFields.length + fields.length})</span>
              )}
            </div>
            <div className="overflow-y-auto p-3">
              <FieldList
                fields={fields}
                lockedFields={lockedFields}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onReorder={reorderFields}
                onDelete={deleteField}
                highlightUnlabeled={saveAttempted}
                duplicateIds={duplicateFieldIds}
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="flex-1 flex flex-col overflow-hidden border-t bg-muted/10">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Player preview</p>
              <span className="text-xs text-muted-foreground">— interactive</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SchemaPreview
                fields={[...lockedFields, ...fields]}
                schemaName={name}
                {...(schemaType !== undefined ? { schemaType } : {})}
              />
            </div>
          </div>
        </div>

        {/* Field editor */}
        <div className="w-72 shrink-0 overflow-y-auto">
          {selectedField ? (
            <FieldEditor field={selectedField} onChange={updateField} schemaType={schemaType} highlightUnlabeled={saveAttempted} />
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
