'use client'

import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function SectionFieldPreview({ field }: PreviewProps) {
  return (
    <div className="pt-2 pb-1">
      <h3 className="text-sm font-semibold border-b pb-1">{field.label || '(Section)'}</h3>
    </div>
  )
}
