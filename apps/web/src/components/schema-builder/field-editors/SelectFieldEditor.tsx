'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { SchemaField, SchemaFieldOption, CharacterSchemaType, Faction } from '@plotrunner/shared'
import { Trash2, Plus } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Row } from './_shared'

interface Props {
  field: SchemaField
  onChange: (field: SchemaField) => void
  schemaType?: CharacterSchemaType
  highlightUnlabeled?: boolean
  codexFactions?: Faction[]
}

export function SelectFieldEditor({ field, onChange, codexFactions }: Props) {
  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  const options: SchemaFieldOption[] = field.options ?? []

  function addOption() {
    update({ options: [...options, { value: uuidv4(), label: '' }] })
  }

  function updateOption(index: number, patch: Partial<SchemaFieldOption>) {
    update({ options: options.map((o, i) => i === index ? { ...o, ...patch } : o) })
  }

  function removeOption(index: number) {
    update({ options: options.filter((_, i) => i !== index) })
  }

  function syncFromCodexFactions() {
    if (!codexFactions?.length) return
    const existing = new Map(options.map(o => [o.label, o]))
    const synced: SchemaFieldOption[] = codexFactions.map(f => {
      const prev = existing.get(f.name)
      return prev ? { ...prev, label: f.name } : { value: uuidv4(), label: f.name }
    })
    update({ options: synced })
  }

  const hasFactions = (codexFactions?.length ?? 0) > 0

  return (
    <>
      {hasFactions && (
        <div className="rounded border border-dashed px-3 py-2 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Codex factions</p>
          <p className="text-xs text-muted-foreground">{codexFactions!.map(f => f.name).join(' · ')}</p>
          <button
            type="button"
            onClick={syncFromCodexFactions}
            className="text-xs text-primary hover:underline"
          >
            Use these as options
          </button>
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-xs">Options</Label>
        {options.map((opt, i) => (
          <div key={opt.value} className="flex gap-1 items-center">
            <Input
              value={opt.label}
              onChange={e => updateOption(i, { label: e.target.value })}
              placeholder={`Option ${i + 1}`}
              className="h-8 text-xs flex-1"
            />
            <Input
              type="number"
              value={opt.xpCost ?? ''}
              onChange={e => updateOption(i, { xpCost: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaFieldOption>)}
              placeholder="XP"
              className="h-8 text-xs w-16"
              title="XP cost for this option"
            />
            <button onClick={() => removeOption(i)} aria-label="Remove option" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addOption} className="w-full h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add option
        </Button>
      </div>

      {field.type === 'multiselect' && (
        <Row label="Max selections (blank = unlimited)">
          <Input type="number" value={field.maxSelections ?? ''} onChange={e => update({ maxSelections: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
        </Row>
      )}
    </>
  )
}
