'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function NumberFieldPreview({ field, value, onChange }: PreviewProps) {
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
