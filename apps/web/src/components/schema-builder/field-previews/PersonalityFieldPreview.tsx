'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function PersonalityFieldPreview({ field, value, onChange }: PreviewProps) {
  const data = (value as { traits?: string[]; ideals?: string[]; bonds?: string[]; flaws?: string[] }) ?? {}
  const traitCount = field.personalityTraitSlots ?? 2
  const idealCount = field.idealSlots ?? 1
  const bondCount = field.bondSlots ?? 1
  const flawCount = field.flawSlots ?? 1

  function updatePSlot(key: 'traits' | 'ideals' | 'bonds' | 'flaws', idx: number, val: string) {
    const arr = [...(data[key] ?? [])]
    arr[idx] = val
    onChange({ ...data, [key]: arr })
  }

  const sections: Array<{ key: 'traits' | 'ideals' | 'bonds' | 'flaws'; label: string; count: number; placeholder: string }> = [
    { key: 'traits', label: 'Personality Traits', count: traitCount, placeholder: 'Describe a personality trait…' },
    { key: 'ideals', label: 'Ideals', count: idealCount, placeholder: 'Describe an ideal…' },
    { key: 'bonds', label: 'Bonds', count: bondCount, placeholder: 'Describe a bond…' },
    { key: 'flaws', label: 'Flaws', count: flawCount, placeholder: 'Describe a flaw…' },
  ]

  return (
    <div className="space-y-4">
      <Label className="text-sm">
        {field.label || 'Personality'}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {sections.filter(s => s.count > 0).map(({ key, label, count, placeholder }) => (
        <div key={key} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          {Array.from({ length: count }, (_, i) => (
            <Textarea
              key={i}
              value={data[key]?.[i] ?? ''}
              onChange={e => updatePSlot(key, i, e.target.value)}
              rows={2}
              placeholder={placeholder}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
