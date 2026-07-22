'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import type { SchemaField, SchemaFieldType, CharacterSchemaType } from '@plotrunner/shared'
import { fieldHasXpCost, calculateXpDelta } from '@/lib/xpCost'

import { SectionFieldPreview } from './field-previews/SectionFieldPreview'
import { TextFieldPreview } from './field-previews/TextFieldPreview'
import { LongtextFieldPreview } from './field-previews/LongtextFieldPreview'
import { NumberFieldPreview } from './field-previews/NumberFieldPreview'
import { ToggleFieldPreview } from './field-previews/ToggleFieldPreview'
import { SelectFieldPreview } from './field-previews/SelectFieldPreview'
import { MultiSelectFieldPreview } from './field-previews/MultiSelectFieldPreview'
import { StatblockFieldPreview } from './field-previews/StatblockFieldPreview'
import { AppearanceFieldPreview } from './field-previews/AppearanceFieldPreview'
import { PersonalityFieldPreview } from './field-previews/PersonalityFieldPreview'
import { FeaturesFieldPreview } from './field-previews/FeaturesFieldPreview'
import { InfluencesFieldPreview } from './field-previews/InfluencesFieldPreview'
import { LanguagesFieldPreview } from './field-previews/LanguagesFieldPreview'
import { HitpointsFieldPreview } from './field-previews/HitpointsFieldPreview'
import { AttacksFieldPreview } from './field-previews/AttacksFieldPreview'
import { SpellsFieldPreview } from './field-previews/SpellsFieldPreview'
import { EquipmentFieldPreview } from './field-previews/EquipmentFieldPreview'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

const PREVIEW_MAP: Partial<Record<SchemaFieldType, ComponentType<PreviewProps>>> = {
  section: SectionFieldPreview,
  text: TextFieldPreview,
  longtext: LongtextFieldPreview,
  number: NumberFieldPreview,
  toggle: ToggleFieldPreview,
  select: SelectFieldPreview,
  multiselect: MultiSelectFieldPreview,
  statblock: StatblockFieldPreview,
  appearance: AppearanceFieldPreview,
  personality: PersonalityFieldPreview,
  features: FeaturesFieldPreview,
  influences: InfluencesFieldPreview,
  languages: LanguagesFieldPreview,
  hitpoints: HitpointsFieldPreview,
  attacks: AttacksFieldPreview,
  spells: SpellsFieldPreview,
  equipment: EquipmentFieldPreview,
}

function PreviewField({ field, value, onChange }: PreviewProps) {
  const Component = PREVIEW_MAP[field.type]
  if (!Component) return null
  return <Component field={field} value={value} onChange={onChange} />
}

interface SchemaPreviewProps {
  fields: SchemaField[]
  schemaName?: string
  schemaType?: CharacterSchemaType
}

export function SchemaPreview({ fields, schemaName, schemaType }: SchemaPreviewProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})

  const showXP = fields.some(f => fieldHasXpCost(f))
  const totalXP = showXP ? calculateXpDelta(fields, {}, values) : 0

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-2 py-12 px-6">
        <p className="text-sm font-medium">Nothing to preview yet</p>
        <p className="text-xs">
          Add fields above to see what players will see when choosing this{' '}
          {schemaType === 'race' ? 'race' : schemaType === 'class' ? 'class' : 'build'}.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-muted/40 border-b">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
          {schemaType === 'race' ? 'Choose your race' : schemaType === 'class' ? 'Choose your class' : 'Character build'}
        </p>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-semibold">{schemaName || '(Unnamed)'}</h3>
          {showXP && (
            <span className="text-sm font-medium tabular-nums shrink-0">
              {totalXP} XP spent
            </span>
          )}
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        {fields.map(field => (
          <PreviewField
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={val => setValues(prev => ({ ...prev, [field.id]: val }))}
          />
        ))}
      </div>
    </div>
  )
}
