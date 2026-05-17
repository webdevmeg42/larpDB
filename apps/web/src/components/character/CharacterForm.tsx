'use client'

import type { SchemaField } from '@larpdb/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

export interface CharacterFormProps {
  fields: SchemaField[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  mode: 'create' | 'edit'
}

function FormField({
  field,
  value,
  onFieldChange,
}: {
  field: SchemaField
  value: unknown
  onFieldChange: (value: unknown) => void
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
    default:
      return null
  }
}

export function CharacterForm({ fields, values, onChange, mode: _mode }: CharacterFormProps) {
  return (
    <div className="space-y-4">
      {fields.map(field => (
        <FormField
          key={field.id}
          field={field}
          value={values[field.id]}
          onFieldChange={value => onChange({ ...values, [field.id]: value })}
        />
      ))}
    </div>
  )
}
