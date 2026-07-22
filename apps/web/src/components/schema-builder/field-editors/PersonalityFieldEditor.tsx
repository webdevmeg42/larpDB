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

export function PersonalityFieldEditor({ field, onChange }: Props) {
  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  return (
    <>
      <Row label="Personality trait slots (0 – 8)">
        <Input type="number" min={0} max={8} value={field.personalityTraitSlots ?? ''} onChange={e => update({ personalityTraitSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
      </Row>
      <Row label="Ideal slots (0 – 6)">
        <Input type="number" min={0} max={6} value={field.idealSlots ?? ''} onChange={e => update({ idealSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
      </Row>
      <Row label="Bond slots (0 – 6)">
        <Input type="number" min={0} max={6} value={field.bondSlots ?? ''} onChange={e => update({ bondSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
      </Row>
      <Row label="Flaw slots (0 – 6)">
        <Input type="number" min={0} max={6} value={field.flawSlots ?? ''} onChange={e => update({ flawSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
      </Row>
    </>
  )
}
