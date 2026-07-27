'use client'

import type { ComponentType } from 'react'
import { Input } from '@/components/ui/input'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SchemaField, CharacterSchemaType, SchemaFieldType } from '@plotrunner/shared'
import { Row, CheckRow } from './field-editors/_shared'
import { NumberFieldEditor } from './field-editors/NumberFieldEditor'
import { ToggleFieldEditor } from './field-editors/ToggleFieldEditor'
import { SelectFieldEditor } from './field-editors/SelectFieldEditor'
import { EquipmentFieldEditor } from './field-editors/EquipmentFieldEditor'
import { PersonalityFieldEditor } from './field-editors/PersonalityFieldEditor'
import { FeaturesFieldEditor } from './field-editors/FeaturesFieldEditor'
import { InfluencesFieldEditor } from './field-editors/InfluencesFieldEditor'
import { LanguagesFieldEditor } from './field-editors/LanguagesFieldEditor'
import { AppearanceFieldEditor } from './field-editors/AppearanceFieldEditor'
import { StatblockFieldEditor } from './field-editors/StatblockFieldEditor'
import { HitpointsFieldEditor } from './field-editors/HitpointsFieldEditor'
import { AttacksFieldEditor } from './field-editors/AttacksFieldEditor'
import { SpellsFieldEditor } from './field-editors/SpellsFieldEditor'

interface FieldEditorProps {
  field: SchemaField
  onChange: (field: SchemaField) => void
  schemaType?: CharacterSchemaType
  highlightUnlabeled?: boolean
}

const TYPE_EDITORS: Partial<Record<SchemaFieldType, ComponentType<FieldEditorProps>>> = {
  number: NumberFieldEditor,
  toggle: ToggleFieldEditor,
  select: SelectFieldEditor,
  multiselect: SelectFieldEditor,
  statblock: StatblockFieldEditor,
  equipment: EquipmentFieldEditor,
  personality: PersonalityFieldEditor,
  features: FeaturesFieldEditor,
  influences: InfluencesFieldEditor,
  languages: LanguagesFieldEditor,
  appearance: AppearanceFieldEditor,
  hitpoints: HitpointsFieldEditor,
  attacks: AttacksFieldEditor,
  spells: SpellsFieldEditor,
}

export function FieldEditor({ field, onChange, schemaType, highlightUnlabeled }: FieldEditorProps) {
  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  const SubEditor = TYPE_EDITORS[field.type]

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          {field.type === 'select' ? 'Dropdown Select' : field.type} field
        </p>
      </div>

      {field.locked && (
        <div className="flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          Required field — always included
        </div>
      )}

      {schemaType === 'class' && (field.type === 'hitpoints' || field.type === 'attacks' || field.type === 'spells') && (
        <div className="flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          Always locked for players — follows level progression
        </div>
      )}

      {schemaType === 'class' && !field.locked && field.type !== 'hitpoints' && field.type !== 'attacks' && field.type !== 'spells' && (
        <CheckRow
          label="Lock for players (GM only)"
          checked={field.gmOnly === true}
          onChange={v => update({ gmOnly: v || undefined } as Partial<SchemaField>)}
        />
      )}

      <Row label="Label">
        <Input
          data-testid="field-label-input"
          value={field.label}
          onChange={e => update({ label: e.target.value })}
          placeholder="Field label"
          className={cn('h-8 text-sm', highlightUnlabeled && !field.label.trim() && 'border-destructive focus-visible:ring-destructive')}
        />
      </Row>

      {field.type !== 'section' && field.type !== 'equipment' && field.type !== 'hitpoints' && field.type !== 'attacks' && field.type !== 'spells' && (
        <CheckRow
          label="Required"
          checked={field.required}
          onChange={v => update({ required: v })}
        />
      )}

      {SubEditor && (
        <SubEditor
          field={field}
          onChange={onChange}
          schemaType={schemaType}
          highlightUnlabeled={highlightUnlabeled}
        />
      )}
    </div>
  )
}
