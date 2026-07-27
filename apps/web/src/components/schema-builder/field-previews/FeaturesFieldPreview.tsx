'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function FeaturesFieldPreview({ field, value, onChange }: PreviewProps) {
  const data = (value as Array<{ title?: string; description?: string }>) ?? []
  const count = field.featureSlots ?? 3

  function updateFeature(idx: number, patch: { title?: string; description?: string }) {
    const arr = [...data]
    arr[idx] = { ...(arr[idx] ?? {}), ...patch }
    onChange(arr)
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm">
        {field.label || 'Features & Traits'}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground italic">Set slot count in the editor →</p>
      ) : Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded border p-3 space-y-2">
          <Input
            value={data[i]?.title ?? ''}
            onChange={e => updateFeature(i, { title: e.target.value })}
            placeholder={`Feature ${i + 1} name…`}
            className="text-sm font-medium"
          />
          <Textarea
            value={data[i]?.description ?? ''}
            onChange={e => updateFeature(i, { description: e.target.value })}
            rows={2}
            placeholder="Description…"
          />
        </div>
      ))}
    </div>
  )
}
