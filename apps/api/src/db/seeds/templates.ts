import { db } from '../index.js'
import { schemaTemplates } from '../schema.js'
import type { SchemaField } from '@larpdb/shared'

const BUILTIN_TEMPLATES: Array<{ name: string; genre: string; description: string; fields: SchemaField[] }> = [
  {
    name: 'Fantasy Adventure',
    genre: 'Fantasy',
    description: 'Classic high-fantasy character sheet with race, class, core stats, and backstory.',
    fields: [
      { id: '11111111-0001-0001-0001-000000000001', label: 'Character Class', type: 'text', required: true, order: 0 },
      { id: '11111111-0001-0001-0001-000000000002', label: 'Race', type: 'text', required: true, order: 1 },
      { id: '11111111-0001-0001-0001-000000000003', label: 'Level', type: 'number', required: true, order: 2, min: 1, max: 20 },
      {
        id: '11111111-0001-0001-0001-000000000004',
        label: 'Core Stats',
        type: 'statblock',
        required: false,
        order: 3,
        stats: [
          { key: 'str', label: 'Strength', min: 1, max: 20 },
          { key: 'dex', label: 'Dexterity', min: 1, max: 20 },
          { key: 'con', label: 'Constitution', min: 1, max: 20 },
          { key: 'int', label: 'Intelligence', min: 1, max: 20 },
          { key: 'wis', label: 'Wisdom', min: 1, max: 20 },
          { key: 'cha', label: 'Charisma', min: 1, max: 20 },
        ],
      },
      { id: '11111111-0001-0001-0001-000000000005', label: 'Backstory', type: 'longtext', required: false, order: 4 },
    ],
  },
  {
    name: 'Sci-Fi Operative',
    genre: 'Sci-Fi',
    description: 'Futuristic character sheet with faction, specialization, rank, and tech/combat attributes.',
    fields: [
      { id: '22222222-0002-0002-0002-000000000001', label: 'Faction', type: 'text', required: true, order: 0 },
      { id: '22222222-0002-0002-0002-000000000002', label: 'Specialization', type: 'text', required: true, order: 1 },
      { id: '22222222-0002-0002-0002-000000000003', label: 'Rank', type: 'number', required: false, order: 2, min: 1, max: 10 },
      {
        id: '22222222-0002-0002-0002-000000000004',
        label: 'Attributes',
        type: 'statblock',
        required: false,
        order: 3,
        stats: [
          { key: 'tech', label: 'Tech', min: 1, max: 10 },
          { key: 'combat', label: 'Combat', min: 1, max: 10 },
          { key: 'social', label: 'Social', min: 1, max: 10 },
          { key: 'piloting', label: 'Piloting', min: 1, max: 10 },
        ],
      },
      { id: '22222222-0002-0002-0002-000000000005', label: 'Background', type: 'longtext', required: false, order: 4 },
    ],
  },
  {
    name: 'Modern Thriller',
    genre: 'Modern',
    description: 'Contemporary setting with occupation, background archetype, and social/physical skills.',
    fields: [
      { id: '33333333-0003-0003-0003-000000000001', label: 'Occupation', type: 'text', required: true, order: 0 },
      {
        id: '33333333-0003-0003-0003-000000000002',
        label: 'Background',
        type: 'select',
        required: true,
        order: 1,
        options: [
          { value: 'criminal', label: 'Criminal' },
          { value: 'entertainer', label: 'Entertainer' },
          { value: 'military', label: 'Military' },
          { value: 'scholar', label: 'Scholar' },
          { value: 'street', label: 'Street' },
        ],
      },
      { id: '33333333-0003-0003-0003-000000000003', label: 'Age', type: 'number', required: false, order: 2, min: 18, max: 99 },
      {
        id: '33333333-0003-0003-0003-000000000004',
        label: 'Skills',
        type: 'statblock',
        required: false,
        order: 3,
        stats: [
          { key: 'strength', label: 'Strength', min: 1, max: 10 },
          { key: 'agility', label: 'Agility', min: 1, max: 10 },
          { key: 'perception', label: 'Perception', min: 1, max: 10 },
          { key: 'charisma', label: 'Charisma', min: 1, max: 10 },
        ],
      },
      { id: '33333333-0003-0003-0003-000000000005', label: 'History', type: 'longtext', required: false, order: 4 },
    ],
  },
  {
    name: 'Horror Survivor',
    genre: 'Horror',
    description: 'Psychological horror sheet with sanity tracking, dark secrets, and survival attributes.',
    fields: [
      { id: '44444444-0004-0004-0004-000000000001', label: 'Archetype', type: 'text', required: true, order: 0 },
      { id: '44444444-0004-0004-0004-000000000002', label: 'Sanity', type: 'number', required: true, order: 1, min: 0, max: 100 },
      {
        id: '44444444-0004-0004-0004-000000000003',
        label: 'Attributes',
        type: 'statblock',
        required: false,
        order: 2,
        stats: [
          { key: 'strength', label: 'Strength', min: 1, max: 10 },
          { key: 'agility', label: 'Agility', min: 1, max: 10 },
          { key: 'fortitude', label: 'Fortitude', min: 1, max: 10 },
          { key: 'willpower', label: 'Willpower', min: 1, max: 10 },
        ],
      },
      { id: '44444444-0004-0004-0004-000000000004', label: 'Dark Secret', type: 'longtext', required: false, order: 3 },
    ],
  },
  {
    name: 'Post-Apocalyptic',
    genre: 'Post-Apocalyptic',
    description: 'Wasteland survival sheet with faction/tribe, background, and core survival skills.',
    fields: [
      { id: '55555555-0005-0005-0005-000000000001', label: 'Faction / Tribe', type: 'text', required: false, order: 0 },
      {
        id: '55555555-0005-0005-0005-000000000002',
        label: 'Background',
        type: 'select',
        required: true,
        order: 1,
        options: [
          { value: 'raider', label: 'Raider' },
          { value: 'scavenger', label: 'Scavenger' },
          { value: 'trader', label: 'Trader' },
          { value: 'settler', label: 'Settler' },
          { value: 'wanderer', label: 'Wanderer' },
        ],
      },
      {
        id: '55555555-0005-0005-0005-000000000003',
        label: 'Survival Skills',
        type: 'statblock',
        required: false,
        order: 2,
        stats: [
          { key: 'strength', label: 'Strength', min: 1, max: 10 },
          { key: 'endurance', label: 'Endurance', min: 1, max: 10 },
          { key: 'perception', label: 'Perception', min: 1, max: 10 },
          { key: 'cunning', label: 'Cunning', min: 1, max: 10 },
        ],
      },
      { id: '55555555-0005-0005-0005-000000000004', label: 'Survival Story', type: 'longtext', required: false, order: 3 },
    ],
  },
]

export async function seedBuiltinTemplates() {
  const existing = await db.select().from(schemaTemplates)
  if (existing.length > 0) return

  await db.insert(schemaTemplates).values(
    BUILTIN_TEMPLATES.map((t) => ({ ...t, isBuiltin: true })),
  )
}
