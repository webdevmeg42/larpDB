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

export function NumberFieldEditor({ field, onChange }: Props) {
  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Row label="Min">
          <Input type="number" value={field.min ?? ''} onChange={e => update({ min: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
        </Row>
        <Row label="Max">
          <Input type="number" value={field.max ?? ''} onChange={e => update({ max: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
        </Row>
      </div>
      <Row label="XP per point">
        <Input type="number" value={field.xpCostPerPoint ?? ''} onChange={e => update({ xpCostPerPoint: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
      </Row>
    </>
  )
}
