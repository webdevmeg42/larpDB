'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function InfluencesFieldPreview({ field, value, onChange }: PreviewProps) {
  const data = (value as { influences?: string[]; languages?: string[] }) ?? {}
  const influenceCount = field.influenceSlots ?? 2
  const languageCount = field.languageSlots ?? 3

  function updateISlot(key: 'influences' | 'languages', idx: number, val: string) {
    const arr = [...(data[key] ?? [])]
    arr[idx] = val
    onChange({ ...data, [key]: arr })
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm">
        {field.label || 'Influences & Languages'}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {influenceCount > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Other Influences</p>
          {Array.from({ length: influenceCount }, (_, i) => (
            <Input
              key={i}
              value={data.influences?.[i] ?? ''}
              onChange={e => updateISlot('influences', i, e.target.value)}
              placeholder={`Influence ${i + 1}…`}
              className="text-sm"
            />
          ))}
        </div>
      )}
      {languageCount > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Languages</p>
          {Array.from({ length: languageCount }, (_, i) => (
            <Input
              key={i}
              value={data.languages?.[i] ?? ''}
              onChange={e => updateISlot('languages', i, e.target.value)}
              placeholder={`Language ${i + 1}…`}
              className="text-sm"
            />
          ))}
        </div>
      )}
    </div>
  )
}
