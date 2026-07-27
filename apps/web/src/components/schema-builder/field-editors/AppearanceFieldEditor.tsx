'use client'

import type { SchemaField, CharacterSchemaType } from '@plotrunner/shared'

interface Props {
  field: SchemaField
  onChange: (field: SchemaField) => void
  schemaType?: CharacterSchemaType
  highlightUnlabeled?: boolean
}

export function AppearanceFieldEditor(_props: Props) {
  return (
    <p className="text-xs text-muted-foreground">
      Includes: Age, Height, Weight, Eyes, Skin, Hair, and a Character Appearance description. No configuration needed.
    </p>
  )
}
