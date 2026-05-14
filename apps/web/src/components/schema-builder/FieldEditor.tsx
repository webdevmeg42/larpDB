'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { SchemaField, SchemaFieldOption, StatBlockStat } from '@larpdb/shared'
import { Trash2, Plus } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface FieldEditorProps {
  field: SchemaField
  onChange: (field: SchemaField) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}

export function FieldEditor({ field, onChange }: FieldEditorProps) {
  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  function renderOptionsEditor() {
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

    return (
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
            <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addOption} className="w-full h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add option
        </Button>
      </div>
    )
  }

  function renderStatsEditor() {
    const stats: StatBlockStat[] = field.stats ?? []

    function addStat() {
      update({ stats: [...stats, { key: uuidv4(), label: '' }] })
    }

    function updateStat(index: number, patch: Partial<StatBlockStat>) {
      update({ stats: stats.map((s, i) => i === index ? { ...s, ...patch } : s) })
    }

    function removeStat(index: number) {
      update({ stats: stats.filter((_, i) => i !== index) })
    }

    return (
      <div className="space-y-2">
        <Label className="text-xs">Stats</Label>
        {stats.map((stat, i) => (
          <div key={stat.key} className="rounded border p-2 space-y-2">
            <div className="flex gap-1 items-center">
              <Input
                value={stat.label}
                onChange={e => updateStat(i, { label: e.target.value })}
                placeholder="Stat name (e.g. STR)"
                className="h-8 text-xs flex-1"
              />
              <button onClick={() => removeStat(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Input
                type="number"
                value={stat.min ?? ''}
                onChange={e => updateStat(i, { min: e.target.value ? Number(e.target.value) : undefined } as Partial<StatBlockStat>)}
                placeholder="Min"
                className="h-7 text-xs"
              />
              <Input
                type="number"
                value={stat.max ?? ''}
                onChange={e => updateStat(i, { max: e.target.value ? Number(e.target.value) : undefined } as Partial<StatBlockStat>)}
                placeholder="Max"
                className="h-7 text-xs"
              />
            </div>
            <Input
              type="number"
              value={stat.xpCostPerPoint ?? ''}
              onChange={e => updateStat(i, { xpCostPerPoint: e.target.value ? Number(e.target.value) : undefined } as Partial<StatBlockStat>)}
              placeholder="XP per point"
              className="h-7 text-xs"
            />
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addStat} className="w-full h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add stat
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          {field.type} field
        </p>
      </div>

      <Row label="Label">
        <Input
          value={field.label}
          onChange={e => update({ label: e.target.value })}
          placeholder="Field label"
          className="h-8 text-sm"
        />
      </Row>

      {field.type !== 'section' && (
        <CheckRow
          label="Required"
          checked={field.required}
          onChange={v => update({ required: v })}
        />
      )}

      {field.type === 'number' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Min">
              <Input
                type="number"
                value={field.min ?? ''}
                onChange={e => update({ min: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)}
                className="h-8 text-sm"
              />
            </Row>
            <Row label="Max">
              <Input
                type="number"
                value={field.max ?? ''}
                onChange={e => update({ max: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)}
                className="h-8 text-sm"
              />
            </Row>
          </div>
          <Row label="XP per point">
            <Input
              type="number"
              value={field.xpCostPerPoint ?? ''}
              onChange={e => update({ xpCostPerPoint: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)}
              className="h-8 text-sm"
            />
          </Row>
        </>
      )}

      {field.type === 'toggle' && (
        <Row label="XP cost (to toggle on)">
          <Input
            type="number"
            value={field.xpCost ?? ''}
            onChange={e => update({ xpCost: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)}
            className="h-8 text-sm"
          />
        </Row>
      )}

      {(field.type === 'select' || field.type === 'multiselect') && renderOptionsEditor()}

      {field.type === 'multiselect' && (
        <Row label="Max selections (blank = unlimited)">
          <Input
            type="number"
            value={field.maxSelections ?? ''}
            onChange={e => update({ maxSelections: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)}
            className="h-8 text-sm"
          />
        </Row>
      )}

      {field.type === 'statblock' && renderStatsEditor()}
    </div>
  )
}
