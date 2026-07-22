'use client'

import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function SelectFieldPreview({ field, value, onChange }: PreviewProps) {
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
}
