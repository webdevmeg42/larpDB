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

export function EquipmentFieldEditor({ field, onChange }: Props) {
  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  return (
    <>
      <Row label="Equipment slots (0 – 20)">
        <Input type="number" min={0} max={20} value={field.equipmentSlots ?? ''} onChange={e => update({ equipmentSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
      </Row>
      <Row label="Treasure slots (0 – 20)">
        <Input type="number" min={0} max={20} value={field.treasureSlots ?? ''} onChange={e => update({ treasureSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
      </Row>
    </>
  )
}
