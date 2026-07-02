'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SchemaField, CharacterSchemaType } from '@larpdb/shared'

const EQUIPMENT_CATEGORIES = [
  'Weapons',
  'Ammo',
  'Light Armor',
  'Medium Armor',
  'Heavy Armor',
  'Shield',
  'Adventure Gear',
  'Utility',
  'Tools',
  'Alchemical and Poison',
  'Mounts/Vehicles',
  'Other',
]

interface EquipmentSlot {
  category: string
  name: string
}

interface EquipmentValue {
  equipment: EquipmentSlot[]
  treasure: EquipmentSlot[]
}

interface SchemaPreviewProps {
  fields: SchemaField[]
  schemaName?: string
  schemaType?: CharacterSchemaType
}

function hasAnyXP(fields: SchemaField[]): boolean {
  return fields.some(f =>
    (f.type === 'number' && f.xpCostPerPoint !== undefined) ||
    (f.type === 'toggle' && f.xpCost !== undefined) ||
    ((f.type === 'select' || f.type === 'multiselect') && (f.options ?? []).some(o => o.xpCost !== undefined)) ||
    (f.type === 'statblock' && (f.stats ?? []).some(s => s.xpCostPerPoint !== undefined)),
  )
}

function computeXP(fields: SchemaField[], values: Record<string, unknown>): number {
  let total = 0
  for (const field of fields) {
    const val = values[field.id]
    if (field.type === 'number' && field.xpCostPerPoint !== undefined) {
      total += (Number(val) || 0) * field.xpCostPerPoint
    } else if (field.type === 'toggle' && field.xpCost !== undefined && val === true) {
      total += field.xpCost
    } else if (field.type === 'select' && typeof val === 'string') {
      const opt = (field.options ?? []).find(o => o.value === val)
      if (opt?.xpCost !== undefined) total += opt.xpCost
    } else if (field.type === 'multiselect' && Array.isArray(val)) {
      for (const v of val as string[]) {
        const opt = (field.options ?? []).find(o => o.value === v)
        if (opt?.xpCost !== undefined) total += opt.xpCost
      }
    } else if (field.type === 'statblock' && field.stats) {
      const statVals = (val as Record<string, number>) ?? {}
      for (const stat of field.stats) {
        if (stat.xpCostPerPoint !== undefined) {
          total += (statVals[stat.key] ?? 0) * stat.xpCostPerPoint
        }
      }
    }
  }
  return total
}

function PreviewField({
  field,
  value,
  onChange,
}: {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}) {
  switch (field.type) {
    case 'section':
      return (
        <div className="pt-2 pb-1">
          <h3 className="text-sm font-semibold border-b pb-1">{field.label || '(Section)'}</h3>
        </div>
      )

    case 'text':
      return (
        <div className="space-y-1">
          <Label className="text-sm">
            {field.label || '(Text field)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={`Enter ${(field.label || 'text').toLowerCase()}…`}
          />
        </div>
      )

    case 'longtext':
      return (
        <div className="space-y-1">
          <Label className="text-sm">
            {field.label || '(Long text)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={`Enter ${(field.label || 'text').toLowerCase()}…`}
            rows={3}
          />
        </div>
      )

    case 'number': {
      const rangeHint = [field.min, field.max]
        .filter((v): v is number => v !== undefined)
        .join(' – ')
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              {field.label || '(Number)'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.xpCostPerPoint !== undefined && (
              <span className="text-xs text-muted-foreground">{field.xpCostPerPoint} XP / pt</span>
            )}
          </div>
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={rangeHint || '0'}
            min={field.min}
            max={field.max}
            className="max-w-[120px]"
          />
        </div>
      )
    }

    case 'toggle': {
      const checked = (value as boolean) ?? false
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
          />
          <span className="text-sm">
            {field.label || '(Toggle)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </span>
          {field.xpCost !== undefined && (
            <span className="text-xs text-muted-foreground ml-auto">{field.xpCost} XP</span>
          )}
        </label>
      )
    }

    case 'select':
      return (
        <div className="space-y-1">
          <Label className="text-sm">
            {field.label || '(Select)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <select
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Choose…</option>
            {(field.options ?? []).map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}{opt.xpCost !== undefined ? ` (${opt.xpCost} XP)` : ''}
              </option>
            ))}
          </select>
          {(field.options ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground italic">No options added yet</p>
          )}
        </div>
      )

    case 'multiselect': {
      const selected = (value as string[]) ?? []
      const atMax = field.maxSelections !== undefined && selected.length >= field.maxSelections
      function toggleOption(val: string) {
        if (selected.includes(val)) {
          onChange(selected.filter(v => v !== val))
        } else if (!atMax) {
          onChange([...selected, val])
        }
      }
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              {field.label || '(Multi-select)'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.maxSelections !== undefined && (
              <span className="text-xs text-muted-foreground">
                {selected.length} / {field.maxSelections} selected
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {(field.options ?? []).map(opt => {
              const isChecked = selected.includes(opt.value)
              const isDisabled = !isChecked && atMax
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 select-none ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => toggleOption(opt.value)}
                  />
                  <span className="text-sm flex-1">{opt.label}</span>
                  {opt.xpCost !== undefined && (
                    <span className="text-xs text-muted-foreground">{opt.xpCost} XP</span>
                  )}
                </label>
              )
            })}
            {(field.options ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground italic">No options added yet</p>
            )}
          </div>
        </div>
      )
    }

    case 'statblock': {
      const statVals = (value as Record<string, number | ''>) ?? {}
      return (
        <div className="space-y-2">
          <Label className="text-sm">
            {field.label || '(Stat Block)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {(field.stats ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No stats added yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {(field.stats ?? []).map(stat => (
                <div key={stat.key} className="space-y-1 text-center">
                  <Label className="text-xs block">{stat.label || stat.key}</Label>
                  <Input
                    type="number"
                    value={statVals[stat.key] ?? ''}
                    onChange={e => {
                      const n = e.target.value ? Number(e.target.value) : ''
                      onChange({ ...statVals, [stat.key]: n })
                    }}
                    placeholder={[stat.min, stat.max].filter((v): v is number => v !== undefined).join('–') || '0'}
                    min={stat.min}
                    max={stat.max}
                    className="h-10 text-center text-base font-bold"
                  />
                  {stat.xpCostPerPoint !== undefined && (
                    <p className="text-xs text-muted-foreground">{stat.xpCostPerPoint} XP/pt</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    case 'appearance': {
      const data = (value as Record<string, string>) ?? {}
      const physicalFields: Array<{ key: string; label: string }> = [
        { key: 'age', label: 'Age' },
        { key: 'height', label: 'Height' },
        { key: 'weight', label: 'Weight' },
        { key: 'eyes', label: 'Eyes' },
        { key: 'skin', label: 'Skin' },
        { key: 'hair', label: 'Hair' },
      ]
      return (
        <div className="space-y-3">
          <Label className="text-sm">
            {field.label || 'Character Appearance'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {physicalFields.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  value={data[key] ?? ''}
                  onChange={e => onChange({ ...data, [key]: e.target.value })}
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
              onChange={e => onChange({ ...data, characterAppearance: e.target.value })}
              rows={3}
              placeholder="Describe your character's appearance…"
            />
          </div>
        </div>
      )
    }

    case 'personality': {
      const data = (value as { traits?: string[]; ideals?: string[]; bonds?: string[]; flaws?: string[] }) ?? {}
      const traitCount = field.personalityTraitSlots ?? 2
      const idealCount = field.idealSlots ?? 1
      const bondCount = field.bondSlots ?? 1
      const flawCount = field.flawSlots ?? 1

      function updatePSlot(key: 'traits' | 'ideals' | 'bonds' | 'flaws', idx: number, val: string) {
        const arr = [...(data[key] ?? [])]
        arr[idx] = val
        onChange({ ...data, [key]: arr })
      }

      const sections: Array<{ key: 'traits' | 'ideals' | 'bonds' | 'flaws'; label: string; count: number; placeholder: string }> = [
        { key: 'traits', label: 'Personality Traits', count: traitCount, placeholder: 'Describe a personality trait…' },
        { key: 'ideals', label: 'Ideals', count: idealCount, placeholder: 'Describe an ideal…' },
        { key: 'bonds', label: 'Bonds', count: bondCount, placeholder: 'Describe a bond…' },
        { key: 'flaws', label: 'Flaws', count: flawCount, placeholder: 'Describe a flaw…' },
      ]

      return (
        <div className="space-y-4">
          <Label className="text-sm">
            {field.label || 'Personality'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {sections.filter(s => s.count > 0).map(({ key, label, count, placeholder }) => (
            <div key={key} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
              {Array.from({ length: count }, (_, i) => (
                <Textarea
                  key={i}
                  value={data[key]?.[i] ?? ''}
                  onChange={e => updatePSlot(key, i, e.target.value)}
                  rows={2}
                  placeholder={placeholder}
                />
              ))}
            </div>
          ))}
        </div>
      )
    }

    case 'features': {
      const data = (value as Array<{ title?: string; description?: string }>) ?? []
      const count = field.featureSlots ?? 3

      function updateFeature(idx: number, patch: { title?: string; description?: string }) {
        const arr = [...data]
        arr[idx] = { ...(arr[idx] ?? {}), ...patch }
        onChange(arr)
      }

      return (
        <div className="space-y-3">
          <Label className="text-sm">
            {field.label || 'Features & Traits'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {count === 0 ? (
            <p className="text-xs text-muted-foreground italic">Set slot count in the editor →</p>
          ) : Array.from({ length: count }, (_, i) => (
            <div key={i} className="rounded border p-3 space-y-2">
              <Input
                value={data[i]?.title ?? ''}
                onChange={e => updateFeature(i, { title: e.target.value })}
                placeholder={`Feature ${i + 1} name…`}
                className="text-sm font-medium"
              />
              <Textarea
                value={data[i]?.description ?? ''}
                onChange={e => updateFeature(i, { description: e.target.value })}
                rows={2}
                placeholder="Description…"
              />
            </div>
          ))}
        </div>
      )
    }

    case 'influences': {
      const data = (value as { influences?: string[]; languages?: string[] }) ?? {}
      const influenceCount = field.influenceSlots ?? 2
      const languageCount = field.languageSlots ?? 3

      function updateISlot(key: 'influences' | 'languages', idx: number, val: string) {
        const arr = [...(data[key] ?? [])]
        arr[idx] = val
        onChange({ ...data, [key]: arr })
      }

      return (
        <div className="space-y-4">
          <Label className="text-sm">
            {field.label || 'Influences & Languages'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {influenceCount > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Other Influences</p>
              {Array.from({ length: influenceCount }, (_, i) => (
                <Input
                  key={i}
                  value={data.influences?.[i] ?? ''}
                  onChange={e => updateISlot('influences', i, e.target.value)}
                  placeholder={`Influence ${i + 1}…`}
                  className="text-sm"
                />
              ))}
            </div>
          )}
          {languageCount > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Languages</p>
              {Array.from({ length: languageCount }, (_, i) => (
                <Input
                  key={i}
                  value={data.languages?.[i] ?? ''}
                  onChange={e => updateISlot('languages', i, e.target.value)}
                  placeholder={`Language ${i + 1}…`}
                  className="text-sm"
                />
              ))}
            </div>
          )}
        </div>
      )
    }

    case 'languages': {
      const data = (value as { languages?: string[] }) ?? {}
      const languageCount = field.languageSlots ?? 3

      function updateLSlot(idx: number, val: string) {
        const arr = [...(data.languages ?? [])]
        arr[idx] = val
        onChange({ ...data, languages: arr })
      }

      return (
        <div className="space-y-4">
          <Label className="text-sm">
            {field.label || 'Languages'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {languageCount > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Languages</p>
              {Array.from({ length: languageCount }, (_, i) => (
                <Input
                  key={i}
                  value={data.languages?.[i] ?? ''}
                  onChange={e => updateLSlot(i, e.target.value)}
                  placeholder={`Language ${i + 1}…`}
                  className="text-sm"
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No language slots configured.</p>
          )}
        </div>
      )
    }

    case 'hitpoints': {
      const entries = [...(field.hitPointEntries ?? [])].sort((a, b) => a.level - b.level)
      return (
        <div className="space-y-2">
          <Label className="text-sm">{field.label || 'Hit Points'}</Label>
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No hit point levels defined yet</p>
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
          <Label className="text-sm">{field.label || 'Attacks'}</Label>
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No attacks defined yet</p>
          ) : (
            <div className="space-y-1.5">
              {entries.map((e, i) => (
                <div key={i} className="rounded border px-3 py-2 flex items-center gap-2 text-sm">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${e.kind === 'new' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                    {e.kind === 'new' ? 'NEW' : 'UPGRADE'}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">Lv {e.level}</span>
                  <span className="flex-1 font-medium">
                    {e.kind === 'new' ? e.name || '(unnamed)' : e.attackName || '(attack)'}
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
          <Label className="text-sm">{field.label || 'Spells'}</Label>
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No spells defined yet</p>
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
                      {e.kind === 'new' ? e.name || '(unnamed)' : e.spellName || '(spell)'}
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

    case 'equipment': {
      const data = (value as EquipmentValue | undefined) ?? { equipment: [], treasure: [] }
      const equipSlots = field.equipmentSlots ?? 0
      const treasureSlots = field.treasureSlots ?? 0

      function updateSlot(kind: 'equipment' | 'treasure', idx: number, patch: Partial<EquipmentSlot>) {
        const arr = [...(data[kind] ?? [])]
        arr[idx] = { category: '', name: '', ...(arr[idx] ?? {}), ...patch }
        onChange({ ...data, [kind]: arr })
      }

      function SlotRow({ kind, idx }: { kind: 'equipment' | 'treasure'; idx: number }) {
        const slot = data[kind]?.[idx] ?? { category: '', name: '' }
        return (
          <div className="flex gap-2">
            <select
              value={slot.category}
              onChange={e => updateSlot(kind, idx, { category: e.target.value })}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm shrink-0 w-44"
            >
              <option value="">Category…</option>
              {EQUIPMENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Input
              value={slot.name}
              onChange={e => updateSlot(kind, idx, { name: e.target.value })}
              placeholder="Item name or description"
              className="text-sm"
            />
          </div>
        )
      }

      if (equipSlots === 0 && treasureSlots === 0) {
        return (
          <div className="space-y-1">
            <Label className="text-sm">{field.label || '(Equipment)'}</Label>
            <p className="text-xs text-muted-foreground italic">Set slot counts in the editor →</p>
          </div>
        )
      }

      return (
        <div className="space-y-4">
          {equipSlots > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">
                Equipment
                <span className="text-xs text-muted-foreground font-normal ml-1">({equipSlots} slots)</span>
              </Label>
              <div className="space-y-2">
                {Array.from({ length: equipSlots }, (_, i) => (
                  <SlotRow key={i} kind="equipment" idx={i} />
                ))}
              </div>
            </div>
          )}
          {treasureSlots > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">
                Treasure
                <span className="text-xs text-muted-foreground font-normal ml-1">({treasureSlots} slots)</span>
              </Label>
              <div className="space-y-2">
                {Array.from({ length: treasureSlots }, (_, i) => (
                  <SlotRow key={i} kind="treasure" idx={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }
  }
}

export function SchemaPreview({ fields, schemaName, schemaType }: SchemaPreviewProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})

  const showXP = hasAnyXP(fields)
  const totalXP = showXP ? computeXP(fields, values) : 0

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-2 py-12 px-6">
        <p className="text-sm font-medium">Nothing to preview yet</p>
        <p className="text-xs">
          Add fields above to see what players will see when choosing this{' '}
          {schemaType === 'race' ? 'race' : schemaType === 'class' ? 'class' : 'build'}.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-muted/40 border-b">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
          {schemaType === 'race' ? 'Choose your race' : schemaType === 'class' ? 'Choose your class' : 'Character build'}
        </p>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-semibold">{schemaName || '(Unnamed)'}</h3>
          {showXP && (
            <span className="text-sm font-medium tabular-nums shrink-0">
              {totalXP} XP spent
            </span>
          )}
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        {fields.map(field => (
          <PreviewField
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={val => setValues(prev => ({ ...prev, [field.id]: val }))}
          />
        ))}
      </div>
    </div>
  )
}
