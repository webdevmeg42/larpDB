'use client'

import type { SchemaField } from '@plotrunner/shared'
import { PHYSICAL_FIELDS } from '@plotrunner/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

export interface CharacterFormProps {
  fields: SchemaField[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  mode: 'create' | 'edit'
  errorFields?: Set<string>
}

function FormField({
  field,
  value,
  onFieldChange,
  hasError,
}: {
  field: SchemaField
  value: unknown
  onFieldChange: (value: unknown) => void
  hasError?: boolean
}) {
  switch (field.type) {
    case 'section':
      return (
        <div className="pt-2 pb-1">
          <h3 className="text-base font-semibold border-b pb-1">{field.label}</h3>
        </div>
      )
    case 'text':
      return (
        <div className="space-y-1">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={field.id}
            value={typeof value === 'string' ? value : ''}
            onChange={e => onFieldChange(e.target.value)}
            className={hasError ? 'border-destructive ring-2 ring-destructive' : undefined}
          />
        </div>
      )
    case 'longtext':
      return (
        <div className="space-y-1">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea
            id={field.id}
            value={typeof value === 'string' ? value : ''}
            onChange={e => onFieldChange(e.target.value)}
            rows={3}
          />
        </div>
      )
    case 'number':
      return (
        <div className="space-y-1">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={field.id}
            type="number"
            value={typeof value === 'number' ? String(value) : ''}
            onChange={e => onFieldChange(e.target.value === '' ? undefined : Number(e.target.value))}
            {...(field.min !== undefined ? { min: field.min } : {})}
            {...(field.max !== undefined ? { max: field.max } : {})}
          />
          {field.xpCostPerPoint !== undefined && (
            <p className="text-xs text-muted-foreground">{field.xpCostPerPoint} XP/point</p>
          )}
        </div>
      )
    case 'toggle': {
      const checked = value === true
      return (
        <label htmlFor={field.id} className="flex items-center gap-2 cursor-pointer">
          <input
            id={field.id}
            type="checkbox"
            checked={checked}
            onChange={e => onFieldChange(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </span>
          {field.xpCost !== undefined && (
            <span className="text-xs text-muted-foreground ml-auto">{field.xpCost} XP</span>
          )}
        </label>
      )
    }
    case 'select': {
      const opts = field.options ?? []
      return (
        <div className="space-y-1">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Select
            id={field.id}
            value={typeof value === 'string' ? value : ''}
            onChange={e => onFieldChange(e.target.value)}
          >
            <option value="">Choose…</option>
            {opts.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}{opt.xpCost !== undefined ? ` (${opt.xpCost} XP)` : ''}
              </option>
            ))}
          </Select>
        </div>
      )
    }
    case 'multiselect': {
      const opts = field.options ?? []
      const selected = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
      const selectedSet = new Set(selected)
      return (
        <div className="space-y-1">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="space-y-1">
            {opts.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSet.has(opt.value)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...selected, opt.value]
                      : selected.filter(v => v !== opt.value)
                    onFieldChange(next)
                  }}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  {opt.label}{opt.xpCost !== undefined ? ` (${opt.xpCost} XP)` : ''}
                </span>
              </label>
            ))}
          </div>
        </div>
      )
    }
    case 'statblock': {
      const stats = field.stats ?? []
      const block = (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value as Record<string, unknown> : {}
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {stats.map(stat => {
              const statInputId = `${field.id}-${stat.key}`
              const statVal = block[stat.key]
              return (
                <div key={stat.key} className="space-y-1">
                  <Label htmlFor={statInputId} className="text-xs">{stat.label}</Label>
                  <Input
                    id={statInputId}
                    type="number"
                    value={typeof statVal === 'number' ? String(statVal) : ''}
                    onChange={e => {
                      const num = e.target.value === '' ? undefined : Number(e.target.value)
                      onFieldChange({ ...block, [stat.key]: num })
                    }}
                    {...(stat.min !== undefined ? { min: stat.min } : {})}
                    {...(stat.max !== undefined ? { max: stat.max } : {})}
                    className="h-8 text-sm"
                  />
                  {stat.xpCostPerPoint !== undefined && (
                    <p className="text-xs text-muted-foreground">{stat.xpCostPerPoint} XP/pt</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    case 'appearance': {
      const data = (typeof value === 'object' && value !== null && !Array.isArray(value))
        ? value as Record<string, string>
        : {}
      return (
        <div className="space-y-3">
          <Label>
            {field.label || 'Character Appearance'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {physicalFields.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  value={data[key] ?? ''}
                  onChange={e => onFieldChange({ ...data, [key]: e.target.value })}
                  placeholder={label}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Character Appearance</Label>
            <Textarea
              value={data.characterAppearance ?? ''}
              onChange={e => onFieldChange({ ...data, characterAppearance: e.target.value })}
              rows={3}
              placeholder="Describe your character's appearance…"
            />
          </div>
        </div>
      )
    }
    case 'hitpoints': {
      const entries = [...(field.hitPointEntries ?? [])].sort((a, b) => a.level - b.level)
      return (
        <div className="space-y-2">
          <Label>{field.label || 'Health Points'}</Label>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No levels defined yet.</p>
          ) : (
            <table className="w-full text-sm border rounded overflow-hidden">
              <thead>
                <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-1.5 text-left font-medium">Level</th>
                  <th className="px-3 py-1.5 text-left font-medium">HP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5 font-mono">{e.level}</td>
                    <td className="px-3 py-1.5 font-mono">{e.hp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )
    }
    case 'attacks': {
      const entries = [...(field.attackEntries ?? [])].sort((a, b) => a.level - b.level)
      return (
        <div className="space-y-2">
          <Label>{field.label || 'Attacks'}</Label>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No attacks defined yet.</p>
          ) : (
            <div className="space-y-1.5">
              {entries.map((e, i) => (
                <div key={i} className="rounded border px-3 py-2 flex items-center gap-2 text-sm">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${e.kind === 'new' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                    {e.kind === 'new' ? 'NEW' : 'UPGRADE'}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">Lv {e.level}</span>
                  <span className="flex-1 font-medium">
                    {e.kind === 'new' ? e.name : (e.attackName ?? e.name)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{e.hitPoints} HP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case 'spells': {
      const entries = [...(field.spellEntries ?? [])].sort((a, b) => a.level - b.level)
      return (
        <div className="space-y-2">
          <Label>{field.label || 'Spells'}</Label>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No spells defined yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div key={i} className="rounded border px-3 py-2 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${e.kind === 'new' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                      {e.kind === 'new' ? 'NEW' : 'UPGRADE'}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">Lv {e.level}</span>
                    <span className="flex-1 font-medium">
                      {e.kind === 'new' ? e.name : (e.spellName ?? e.name)}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{e.hitPoints} HP</span>
                  </div>
                  {e.effects && (
                    <p className="text-xs text-muted-foreground pl-1">{e.effects}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case 'languages': {
      const data = (value as { languages?: string[] }) ?? {}
      const languageCount = field.languageSlots ?? 3

      function updateSlot(idx: number, val: string) {
        const arr = [...(data.languages ?? [])]
        arr[idx] = val
        onFieldChange({ ...data, languages: arr })
      }

      return (
        <div className="space-y-2">
          <Label>
            {field.label || 'Languages'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {Array.from({ length: languageCount }, (_, i) => (
            <Input
              key={i}
              id={`${field.id}-lang-${i}`}
              value={data.languages?.[i] ?? ''}
              onChange={e => updateSlot(i, e.target.value)}
              placeholder={`Language ${i + 1}…`}
              className="text-sm"
            />
          ))}
        </div>
      )
    }
    default:
      return null
  }
}

export function CharacterForm({ fields, values, onChange, mode: _mode, errorFields }: CharacterFormProps) {
  return (
    <div className="space-y-4">
      {fields.map(field => (
        <FormField
          key={field.id}
          field={field}
          value={values[field.id]}
          onFieldChange={value => onChange({ ...values, [field.id]: value })}
          {...(errorFields?.has(field.id) ? { hasError: true } : {})}
        />
      ))}
    </div>
  )
}
