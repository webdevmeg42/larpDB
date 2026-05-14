'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import type { SchemaField } from '@larpdb/shared'

function PreviewField({ field }: { field: SchemaField }) {
  switch (field.type) {
    case 'section':
      return (
        <div className="pt-2 pb-1">
          <h3 className="text-base font-semibold border-b pb-1">{field.label || '(Section)'}</h3>
        </div>
      )

    case 'text':
      return (
        <div className="space-y-1">
          <Label>
            {field.label || '(Text field)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input placeholder={`Enter ${field.label?.toLowerCase() || 'text'}…`} disabled />
        </div>
      )

    case 'longtext':
      return (
        <div className="space-y-1">
          <Label>
            {field.label || '(Long text)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea placeholder={`Enter ${field.label?.toLowerCase() || 'text'}…`} disabled rows={3} />
        </div>
      )

    case 'number':
      return (
        <div className="space-y-1">
          <Label>
            {field.label || '(Number)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            type="number"
            placeholder={[field.min, field.max].filter((v): v is number => v !== undefined).join(' – ') || '0'}
            disabled
          />
          {field.xpCostPerPoint !== undefined && (
            <p className="text-xs text-muted-foreground">{field.xpCostPerPoint} XP per point</p>
          )}
        </div>
      )

    case 'toggle':
      return (
        <label className="flex items-center gap-2 cursor-not-allowed opacity-60">
          <input type="checkbox" className="h-4 w-4" disabled />
          <span className="text-sm">
            {field.label || '(Toggle)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </span>
          {field.xpCost !== undefined && (
            <span className="text-xs text-muted-foreground ml-auto">{field.xpCost} XP</span>
          )}
        </label>
      )

    case 'select':
      return (
        <div className="space-y-1">
          <Label>
            {field.label || '(Select)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Select disabled>
            <option value="">Choose…</option>
            {(field.options ?? []).map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}{opt.xpCost !== undefined ? ` (${opt.xpCost} XP)` : ''}
              </option>
            ))}
          </Select>
        </div>
      )

    case 'multiselect':
      return (
        <div className="space-y-1">
          <Label>
            {field.label || '(Multi-select)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="space-y-1">
            {(field.options ?? []).map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-not-allowed opacity-60">
                <input type="checkbox" className="h-4 w-4" disabled />
                <span className="text-sm">
                  {opt.label}{opt.xpCost !== undefined ? ` (${opt.xpCost} XP)` : ''}
                </span>
              </label>
            ))}
          </div>
          {field.maxSelections !== undefined && (
            <p className="text-xs text-muted-foreground">Max {field.maxSelections} selections</p>
          )}
        </div>
      )

    case 'statblock':
      return (
        <div className="space-y-2">
          <Label>
            {field.label || '(Stat Block)'}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(field.stats ?? []).map(stat => (
              <div key={stat.key} className="space-y-1">
                <Label className="text-xs">{stat.label}</Label>
                <Input
                  type="number"
                  placeholder={[stat.min, stat.max].filter((v): v is number => v !== undefined).join('-') || '0'}
                  disabled
                  className="h-8 text-sm"
                />
                {stat.xpCostPerPoint !== undefined && (
                  <p className="text-xs text-muted-foreground">{stat.xpCostPerPoint} XP/pt</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )
  }
}

export function SchemaPreview({ fields }: { fields: SchemaField[] }) {
  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Add fields to see the preview
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-6 space-y-4 max-w-lg">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Character sheet preview</p>
      {fields.map(field => (
        <PreviewField key={field.id} field={field} />
      ))}
    </div>
  )
}
