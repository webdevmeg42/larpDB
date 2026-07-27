'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function LanguagesFieldPreview({ field, value, onChange }: PreviewProps) {
  const data = (value as { languages?: string[] }) ?? {}
  const languageCount = field.languageSlots ?? 3

  function updateLSlot(idx: number, val: string) {
    const arr = [...(data.languages ?? [])]
    arr[idx] = val
    onChange({ ...data, languages: arr })
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm">
        {field.label || 'Languages'}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {languageCount > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Languages</p>
          {Array.from({ length: languageCount }, (_, i) => (
            <Input
              key={i}
              value={data.languages?.[i] ?? ''}
              onChange={e => updateLSlot(i, e.target.value)}
              placeholder={`Language ${i + 1}…`}
              className="text-sm"
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No language slots configured.</p>
      )}
    </div>
  )
}
