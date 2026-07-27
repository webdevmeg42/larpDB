import { v4 as uuidv4 } from 'uuid'
import type { SchemaField, SchemaFieldType, CharacterSchemaType } from '@plotrunner/shared'

export const RACE_LOCKED_FIELDS: SchemaField[] = [
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    type: 'text',
    label: 'Character Name',
    required: true,
    order: 0,
    locked: true,
  },
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000002',
    type: 'longtext',
    label: 'Allies and Organizations',
    required: false,
    order: 1,
    locked: true,
  },
]

export const DEFAULT_LEVEL_ENTRIES = [{ level: 1, value: 0 }, { level: 2, value: 0 }, { level: 3, value: 0 }]
export const DEFAULT_HP_ENTRIES = [{ level: 1, hp: 5 }, { level: 2, hp: 10 }, { level: 3, hp: 15 }]

export const CLASS_LOCKED_FIELDS: SchemaField[] = [
  {
    id: 'bbbbbbbb-0000-0000-0000-000000000001',
    type: 'statblock',
    label: 'Core Stats',
    required: true,
    order: 0,
    locked: true,
    stats: [
      { key: 'str', label: 'Strength', min: 1, max: 20, levelEntries: DEFAULT_LEVEL_ENTRIES },
      { key: 'dex', label: 'Dexterity', min: 1, max: 20, levelEntries: DEFAULT_LEVEL_ENTRIES },
      { key: 'con', label: 'Constitution', min: 1, max: 20, levelEntries: DEFAULT_LEVEL_ENTRIES },
      { key: 'int', label: 'Intelligence', min: 1, max: 20, levelEntries: DEFAULT_LEVEL_ENTRIES },
      { key: 'wis', label: 'Wisdom', min: 1, max: 20, levelEntries: DEFAULT_LEVEL_ENTRIES },
      { key: 'cha', label: 'Charisma', min: 1, max: 20, levelEntries: DEFAULT_LEVEL_ENTRIES },
    ],
  },
  {
    id: 'bbbbbbbb-0000-0000-0000-000000000002',
    type: 'hitpoints',
    label: 'Health Points',
    required: true,
    order: 1,
    locked: true,
    hitPointEntries: DEFAULT_HP_ENTRIES,
  },
]

export function getLockedDefaults(schemaType: CharacterSchemaType | undefined): SchemaField[] {
  if (schemaType === 'race') return RACE_LOCKED_FIELDS
  if (schemaType === 'class') return CLASS_LOCKED_FIELDS
  return []
}

export function initLockedFields(schemaType: CharacterSchemaType | undefined, initialFields: SchemaField[]): SchemaField[] {
  const defaults = getLockedDefaults(schemaType)
  return defaults.map(def => {
    const stored = initialFields.find(f => f.id === def.id)
    if (!stored) return def
    const base = { ...stored, locked: true }
    // Backfill pre-populated level entries for schemas saved before this requirement
    if (def.type === 'hitpoints' && !(stored.hitPointEntries?.length)) {
      return { ...base, hitPointEntries: def.hitPointEntries ?? [] } as SchemaField
    }
    if (def.type === 'statblock' && def.stats) {
      const mergedStats = def.stats.map(defaultStat => {
        const storedStat = stored.stats?.find(s => s.key === defaultStat.key) ?? defaultStat
        if (!(storedStat.levelEntries?.length)) {
          return { ...storedStat, levelEntries: defaultStat.levelEntries ?? [] }
        }
        return storedStat
      })
      return { ...base, stats: mergedStats } as SchemaField
    }
    return base as SchemaField
  })
}

export function makeDefaultField(type: SchemaFieldType, order: number, defaultLabel = ''): SchemaField {
  const base = { id: uuidv4(), label: defaultLabel, type, required: false, order }
  switch (type) {
    case 'select':
    case 'multiselect':
      return { ...base, options: [] } as SchemaField
    case 'number':
      return { ...base } as SchemaField
    case 'statblock':
      return { ...base, stats: [] } as SchemaField
    case 'equipment':
      return { ...base, equipmentSlots: 3, treasureSlots: 3 } as SchemaField
    case 'personality':
      return { ...base, personalityTraitSlots: 2, idealSlots: 1, bondSlots: 1, flawSlots: 1 } as SchemaField
    case 'features':
      return { ...base, featureSlots: 3 } as SchemaField
    case 'influences':
      return { ...base, influenceSlots: 2 } as SchemaField
    case 'languages':
      return { ...base, languageSlots: 3 } as SchemaField
    case 'appearance':
      return { ...base } as SchemaField
    case 'hitpoints':
      return { ...base, hitPointEntries: [...DEFAULT_HP_ENTRIES] } as SchemaField
    case 'attacks':
      return { ...base, attackEntries: [
        { kind: 'new', level: 1, name: '', hitPoints: 5 },
        { kind: 'new', level: 2, name: '', hitPoints: 5 },
        { kind: 'new', level: 3, name: '', hitPoints: 5 },
      ] } as SchemaField
    case 'spells':
      return { ...base, spellEntries: [
        { kind: 'new', level: 1, name: '', hitPoints: 5, effects: '' },
        { kind: 'new', level: 2, name: '', hitPoints: 5, effects: '' },
        { kind: 'new', level: 3, name: '', hitPoints: 5, effects: '' },
      ] } as SchemaField
    default:
      return base as SchemaField
  }
}
