'use client'

import type { SchemaField, AttackEntry, SpellEntry } from '@larpdb/shared'

function SheetField({ field, value }: { field: SchemaField; value: unknown }) {
  switch (field.type) {
    case 'section':
      return (
        <div className="pt-2 pb-1">
          <h3 className="text-base font-semibold border-b pb-1">{field.label}</h3>
        </div>
      )
    case 'text':
    case 'longtext':
      return (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</p>
          <p className="text-sm">{typeof value === 'string' ? value : '—'}</p>
        </div>
      )
    case 'number':
      return (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</p>
          <p className="text-sm">{typeof value === 'number' ? String(value) : '—'}</p>
        </div>
      )
    case 'toggle': {
      const checked = value === true
      return (
        <label htmlFor={field.id} className="flex items-center gap-2">
          <input id={field.id} type="checkbox" checked={checked} readOnly className="h-4 w-4" />
          <span className="text-sm">{field.label}</span>
        </label>
      )
    }
    case 'select': {
      const opts = field.options ?? []
      const opt = opts.find(o => o.value === value)
      const display = opt ? opt.label : typeof value === 'string' && value ? value : '—'
      return (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</p>
          <p className="text-sm">{display}</p>
        </div>
      )
    }
    case 'multiselect': {
      const opts = field.options ?? []
      const selected = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
      const labels = selected.map(v => opts.find(o => o.value === v)?.label ?? v)
      return (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</p>
          <p className="text-sm">{labels.length > 0 ? labels.join(', ') : '—'}</p>
        </div>
      )
    }
    case 'statblock': {
      const stats = field.stats ?? []
      const block = (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value as Record<string, unknown> : {}
      const hasLevelProgression = stats.some(s => (s.levelEntries ?? []).length > 0)
      if (hasLevelProgression) {
        const hasComputedValues = stats.some(s => block[s.key] !== undefined)
        if (hasComputedValues) {
          return (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</p>
              <div className="grid grid-cols-3 gap-2">
                {stats.map(stat => (
                  <div key={stat.key} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-sm font-medium">
                      {typeof block[stat.key] === 'number' ? String(block[stat.key]) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        const allLevels = [...new Set(
          stats.flatMap(s => (s.levelEntries ?? []).map(e => e.level))
        )].sort((a, b) => a - b)
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</p>
            {allLevels.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="px-3 py-1.5 text-left font-medium">Level</th>
                      {stats.map(s => (
                        <th key={s.key} className="px-3 py-1.5 text-left font-medium">{s.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allLevels.map(level => (
                      <tr key={level} className="border-t">
                        <td className="px-3 py-1.5 font-mono">{level}</td>
                        {stats.map(s => {
                          const entry = (s.levelEntries ?? []).find(e => e.level === level)
                          return (
                            <td key={s.key} className="px-3 py-1.5 font-mono">
                              {entry !== undefined ? entry.value : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      }
      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</p>
          <div className="grid grid-cols-3 gap-2">
            {stats.map(stat => {
              const statVal = block[stat.key]
              return (
                <div key={stat.key} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-medium">{typeof statVal === 'number' ? String(statVal) : '—'}</p>
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
      const physicalFields = [
        { key: 'age', label: 'Age' },
        { key: 'height', label: 'Height' },
        { key: 'weight', label: 'Weight' },
        { key: 'eyes', label: 'Eyes' },
        { key: 'skin', label: 'Skin' },
        { key: 'hair', label: 'Hair' },
      ]
      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {field.label || 'Character Appearance'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {physicalFields.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{data[key] || '—'}</p>
              </div>
            ))}
          </div>
          {data.characterAppearance && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{data.characterAppearance}</p>
            </div>
          )}
        </div>
      )
    }
    case 'hitpoints': {
      if (typeof value === 'number') {
        return (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {field.label || 'Health Points'}
            </p>
            <p className="text-sm font-medium">{value} HP</p>
          </div>
        )
      }
      const entries = [...(field.hitPointEntries ?? [])].sort((a, b) => a.level - b.level)
      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {field.label || 'Health Points'}
          </p>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
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
      const valueEntries = Array.isArray(value) ? value as AttackEntry[] : null
      const entries = [...(valueEntries ?? field.attackEntries ?? [])].sort((a, b) => a.level - b.level)
      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {field.label || 'Attacks'}
          </p>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
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
      const valueEntries = Array.isArray(value) ? value as SpellEntry[] : null
      const entries = [...(valueEntries ?? field.spellEntries ?? [])].sort((a, b) => a.level - b.level)
      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {field.label || 'Spells'}
          </p>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
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
  }
}

export interface CharacterSheetProps {
  fields: SchemaField[]
  values: Record<string, unknown>
}

export function CharacterSheet({ fields, values }: CharacterSheetProps) {
  return (
    <div className="space-y-4">
      {fields.map(field => (
        <SheetField key={field.id} field={field} value={values[field.id]} />
      ))}
    </div>
  )
}
