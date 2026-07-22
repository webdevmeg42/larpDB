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

export function InfluencesFieldEditor({ field, onChange }: Props) {
  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  return (
    <Row label="Influence slots (0 – 10)">
      <Input type="number" min={0} max={10} value={field.influenceSlots ?? ''} onChange={e => update({ influenceSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
    </Row>
  )
}
