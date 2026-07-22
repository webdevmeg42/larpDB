'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SchemaField } from '@plotrunner/shared'
import { PHYSICAL_FIELDS } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function AppearanceFieldPreview({ field, value, onChange }: PreviewProps) {
  const data = (value as Record<string, string>) ?? {}
  return (
    <div className="space-y-3">
      <Label className="text-sm">
        {field.label || 'Character Appearance'}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="grid grid-cols-3 gap-3">
        {PHYSICAL_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Input
              value={data[key] ?? ''}
              onChange={e => onChange({ ...data, [key]: e.target.value })}
              placeholder={label}
              className="text-sm"
            />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Character Appearance</Label>
        <Textarea
          value={data.characterAppearance ?? ''}
          onChange={e => onChange({ ...data, characterAppearance: e.target.value })}
          rows={3}
          placeholder="Describe your character's appearance…"
        />
      </div>
    </div>
  )
}
