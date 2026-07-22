'use client'

import { Input } from '@/components/ui/input'
import type { SchemaField, CharacterSchemaType } from '@plotrunner/shared'
import { Row } from './_shared'

interface Props {
  field: SchemaField
  onChange: (field: SchemaField) => void
  schemaType?: CharacterSchemaType
  highlightUnlabeled?: boolean
}

export function FeaturesFieldEditor({ field, onChange }: Props) {
  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  return (
    <Row label="Feature slots (0 – 20)">
      <Input type="number" min={0} max={20} value={field.featureSlots ?? ''} onChange={e => update({ featureSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
    </Row>
  )
}
