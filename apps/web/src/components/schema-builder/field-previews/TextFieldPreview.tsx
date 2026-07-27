'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function TextFieldPreview({ field, value, onChange }: PreviewProps) {
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
}
