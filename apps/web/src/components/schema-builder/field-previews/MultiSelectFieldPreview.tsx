'use client'

import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function MultiSelectFieldPreview({ field, value, onChange }: PreviewProps) {
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
