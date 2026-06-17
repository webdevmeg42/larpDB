export type SchemaFieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'toggle'
  | 'statblock'
  | 'section'
  | 'equipment'
  | 'personality'
  | 'features'
  | 'influences'
  | 'appearance'
  | 'hitpoints'
  | 'attacks'
  | 'spells'

export interface HitPointEntry {
  level: number
  hp: number
}

export interface AttackEntry {
  kind: 'new' | 'upgrade'
  level: number
  name: string
  attackName?: string
  hitPoints: number
}

export interface SpellEntry {
  kind: 'new' | 'upgrade'
  level: number
  name: string
  spellName?: string
  hitPoints: number
  effects: string
}

export interface SchemaFieldOption {
  value: string
  label: string
  xpCost?: number
}

export interface StatBlockStat {
  key: string
  label: string
  min?: number
  max?: number
  xpCostPerPoint?: number
}

export interface SchemaField {
  id: string
  label: string
  type: SchemaFieldType
  required: boolean
  order: number
  locked?: boolean
  min?: number
  max?: number
  xpCostPerPoint?: number
  options?: SchemaFieldOption[]
  maxSelections?: number
  stats?: StatBlockStat[]
  xpCost?: number
  equipmentSlots?: number
  treasureSlots?: number
  personalityTraitSlots?: number
  idealSlots?: number
  bondSlots?: number
  flawSlots?: number
  featureSlots?: number
  influenceSlots?: number
  languageSlots?: number
  hitPointEntries?: HitPointEntry[]
  attackEntries?: AttackEntry[]
  spellEntries?: SpellEntry[]
}

export type CharacterSchemaType = 'race' | 'class'

export interface CharacterSchema {
  id: string
  name: string
  version: number
  fields: SchemaField[]
  templateSource: string | null
  isActive: boolean
  type: CharacterSchemaType
  createdAt: string
}

export interface SchemaTemplate {
  id: string
  name: string
  genre: string
  description: string | null
  fields: SchemaField[]
  isBuiltin: boolean
}

export interface Character {
  id: string
  userId: string
  schemaId: string
  name: string
  portraitUrl: string | null
  data: Record<string, unknown>
  totalXp: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
