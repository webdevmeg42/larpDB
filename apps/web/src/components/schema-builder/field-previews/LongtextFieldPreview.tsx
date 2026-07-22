'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function LongtextFieldPreview({ field, value, onChange }: PreviewProps) {
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
}
