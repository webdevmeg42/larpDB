'use client'

import type { SchemaField } from '@larpdb/shared'

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
