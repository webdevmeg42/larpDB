'use client'

import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function ToggleFieldPreview({ field, value, onChange }: PreviewProps) {
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
