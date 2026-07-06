import { eq, and } from 'drizzle-orm'
import { db } from '../index.js'
import { schemaTemplates } from '../schema.js'
import type { SchemaField } from '@larpdb/shared'

const RACE_TEMPLATES: Array<{ name: string; genre: string; description: string; type: string; fields: SchemaField[] }> = [
  {
    name: 'Fantasy Adventure',
    genre: 'Fantasy',
    description: 'Classic high-fantasy sheet with core stats and backstory.',
    type: 'race',
    fields: [
      {
        id: '11111111-0001-0001-0001-000000000004',
        label: 'Core Stats',
        type: 'statblock',
        required: false,
        order: 0,
        stats: [
          { key: 'str', label: 'Strength', min: 1, max: 20 },
          { key: 'dex', label: 'Dexterity', min: 1, max: 20 },
          { key: 'con', label: 'Constitution', min: 1, max: 20 },
          { key: 'int', label: 'Intelligence', min: 1, max: 20 },
          { key: 'wis', label: 'Wisdom', min: 1, max: 20 },
          { key: 'cha', label: 'Charisma', min: 1, max: 20 },
        ],
      },
      {
        id: '11111111-0001-0001-0001-000000000006',
        label: 'Skills',
        type: 'statblock',
        required: false,
        order: 1,
        stats: [
          { key: 'acrobatics', label: 'Acrobatics', min: 0 },
          { key: 'animal_hunting', label: 'Animal Hunting', min: 0 },
          { key: 'arcana', label: 'Arcana', min: 0 },
          { key: 'athletics', label: 'Athletics', min: 0 },
          { key: 'deception', label: 'Deception', min: 0 },
          { key: 'history', label: 'History', min: 0 },
          { key: 'insight', label: 'Insight', min: 0 },
          { key: 'intimidation', label: 'Intimidation', min: 0 },
          { key: 'investigation', label: 'Investigation', min: 0 },
          { key: 'medicine', label: 'Medicine', min: 0 },
          { key: 'nature', label: 'Nature', min: 0 },
          { key: 'perception', label: 'Perception', min: 0 },
          { key: 'religion', label: 'Religion', min: 0 },
          { key: 'sleight_of_hand', label: 'Sleight of Hand', min: 0 },
          { key: 'stealth', label: 'Stealth', min: 0 },
          { key: 'survival', label: 'Survival', min: 0 },
        ],
      },
    ],
  },
  {
    name: 'Sci-Fi Operative',
    genre: 'Sci-Fi',
    description: 'Futuristic character sheet with faction, specialization, rank, and tech/combat attributes.',
    type: 'race',
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
    ],
  },
  {
    name: 'Modern Thriller',
    genre: 'Modern',
    description: 'Contemporary setting with occupation, background archetype, and social/physical skills.',
    type: 'race',
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
    ],
  },
  {
    name: 'Horror Survivor',
    genre: 'Horror',
    description: 'Psychological horror sheet with sanity tracking, dark secrets, and survival attributes.',
    type: 'race',
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
    ],
  },
  {
    name: 'Post-Apocalyptic',
    genre: 'Post-Apocalyptic',
    description: 'Wasteland survival sheet with faction/tribe, background, and core survival skills.',
    type: 'race',
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
    ],
  },
]

const CORE_STATS: Omit<SchemaField, 'id'> = {
  label: 'Core Stats',
  type: 'statblock',
  required: false,
  order: 2,
  stats: [
    { key: 'str', label: 'Strength', min: 1, max: 20 },
    { key: 'dex', label: 'Dexterity', min: 1, max: 20 },
    { key: 'con', label: 'Constitution', min: 1, max: 20 },
    { key: 'int', label: 'Intelligence', min: 1, max: 20 },
    { key: 'wis', label: 'Wisdom', min: 1, max: 20 },
    { key: 'cha', label: 'Charisma', min: 1, max: 20 },
  ],
}

const CLASS_TEMPLATES: Array<{ name: string; genre: string; description: string; type: string; fields: SchemaField[] }> = [
  {
    name: 'Warrior',
    genre: 'Fantasy',
    description: 'A combat-focused class built for physical might and battlefield prowess.',
    type: 'class',
    fields: [
      { id: 'aa000001-aa01-aa01-aa01-000000000001', label: 'Level', type: 'number', required: true, order: 0, min: 1, max: 20 },
      { id: 'aa000001-aa01-aa01-aa01-000000000002', label: 'Hit Points', type: 'number', required: true, order: 1, min: 1 },
      { ...CORE_STATS, id: 'aa000001-aa01-aa01-aa01-000000000003' },
      {
        id: 'aa000001-aa01-aa01-aa01-000000000004',
        label: 'Weapon Proficiencies',
        type: 'multiselect',
        required: false,
        order: 3,
        options: [
          { value: 'sword', label: 'Sword' },
          { value: 'axe', label: 'Axe' },
          { value: 'mace', label: 'Mace' },
          { value: 'bow', label: 'Bow' },
          { value: 'spear', label: 'Spear' },
          { value: 'shield', label: 'Shield' },
          { value: 'dagger', label: 'Dagger' },
        ],
      },
      {
        id: 'aa000001-aa01-aa01-aa01-000000000005',
        label: 'Armor Proficiency',
        type: 'select',
        required: false,
        order: 4,
        options: [
          { value: 'unarmored', label: 'Unarmored' },
          { value: 'light', label: 'Light' },
          { value: 'medium', label: 'Medium' },
          { value: 'heavy', label: 'Heavy' },
        ],
      },
      { id: 'aa000001-aa01-aa01-aa01-000000000006', label: 'Combat Abilities', type: 'longtext', required: false, order: 5 },
    ],
  },
  {
    name: 'Druid',
    genre: 'Fantasy',
    description: 'A nature-attuned class that shapeshifts and commands the elements.',
    type: 'class',
    fields: [
      { id: 'aa000002-aa02-aa02-aa02-000000000001', label: 'Level', type: 'number', required: true, order: 0, min: 1, max: 20 },
      { id: 'aa000002-aa02-aa02-aa02-000000000002', label: 'Hit Points', type: 'number', required: true, order: 1, min: 1 },
      { ...CORE_STATS, id: 'aa000002-aa02-aa02-aa02-000000000003' },
      {
        id: 'aa000002-aa02-aa02-aa02-000000000004',
        label: 'Circle',
        type: 'select',
        required: false,
        order: 3,
        options: [
          { value: 'land', label: 'Circle of the Land' },
          { value: 'moon', label: 'Circle of the Moon' },
          { value: 'spores', label: 'Circle of Spores' },
          { value: 'stars', label: 'Circle of Stars' },
        ],
      },
      { id: 'aa000002-aa02-aa02-aa02-000000000005', label: 'Animal Forms', type: 'longtext', required: false, order: 4 },
      { id: 'aa000002-aa02-aa02-aa02-000000000006', label: 'Spells', type: 'longtext', required: false, order: 5 },
    ],
  },
  {
    name: 'Wizard',
    genre: 'Fantasy',
    description: 'A scholarly magic-user who masters arcane schools and wields powerful spells.',
    type: 'class',
    fields: [
      { id: 'aa000003-aa03-aa03-aa03-000000000001', label: 'Level', type: 'number', required: true, order: 0, min: 1, max: 20 },
      { id: 'aa000003-aa03-aa03-aa03-000000000002', label: 'Hit Points', type: 'number', required: true, order: 1, min: 1 },
      { ...CORE_STATS, id: 'aa000003-aa03-aa03-aa03-000000000003' },
      {
        id: 'aa000003-aa03-aa03-aa03-000000000004',
        label: 'Arcane School',
        type: 'select',
        required: false,
        order: 3,
        options: [
          { value: 'abjuration', label: 'Abjuration' },
          { value: 'conjuration', label: 'Conjuration' },
          { value: 'divination', label: 'Divination' },
          { value: 'enchantment', label: 'Enchantment' },
          { value: 'evocation', label: 'Evocation' },
          { value: 'illusion', label: 'Illusion' },
          { value: 'necromancy', label: 'Necromancy' },
          { value: 'transmutation', label: 'Transmutation' },
        ],
      },
      { id: 'aa000003-aa03-aa03-aa03-000000000005', label: 'Spells', type: 'longtext', required: false, order: 5 },
      {
        id: 'aa000003-aa03-aa03-aa03-000000000006',
        label: 'Spell Slots',
        type: 'statblock',
        required: false,
        order: 6,
        stats: [
          { key: 'slot_1', label: '1st Level', min: 0 },
          { key: 'slot_2', label: '2nd Level', min: 0 },
          { key: 'slot_3', label: '3rd Level', min: 0 },
          { key: 'slot_4', label: '4th Level', min: 0 },
          { key: 'slot_5', label: '5th Level', min: 0 },
        ],
      },
    ],
  },
  {
    name: 'Sorcerer',
    genre: 'Fantasy',
    description: 'An innate magic-user whose power flows from a mysterious bloodline or origin.',
    type: 'class',
    fields: [
      { id: 'aa000004-aa04-aa04-aa04-000000000001', label: 'Level', type: 'number', required: true, order: 0, min: 1, max: 20 },
      { id: 'aa000004-aa04-aa04-aa04-000000000002', label: 'Hit Points', type: 'number', required: true, order: 1, min: 1 },
      { ...CORE_STATS, id: 'aa000004-aa04-aa04-aa04-000000000003' },
      {
        id: 'aa000004-aa04-aa04-aa04-000000000004',
        label: 'Sorcerous Origin',
        type: 'select',
        required: false,
        order: 3,
        options: [
          { value: 'draconic', label: 'Draconic Bloodline' },
          { value: 'wild_magic', label: 'Wild Magic' },
          { value: 'divine_soul', label: 'Divine Soul' },
          { value: 'shadow', label: 'Shadow Magic' },
        ],
      },
      { id: 'aa000004-aa04-aa04-aa04-000000000005', label: 'Sorcery Points', type: 'number', required: false, order: 4, min: 0, max: 20 },
      { id: 'aa000004-aa04-aa04-aa04-000000000006', label: 'Spells Known', type: 'longtext', required: false, order: 5 },
    ],
  },
  {
    name: 'Medic',
    genre: 'Fantasy',
    description: 'A healer and field support specialist who keeps allies alive through combat.',
    type: 'class',
    fields: [
      { id: 'aa000005-aa05-aa05-aa05-000000000001', label: 'Level', type: 'number', required: true, order: 0, min: 1, max: 20 },
      { id: 'aa000005-aa05-aa05-aa05-000000000002', label: 'Hit Points', type: 'number', required: true, order: 1, min: 1 },
      { ...CORE_STATS, id: 'aa000005-aa05-aa05-aa05-000000000003' },
      {
        id: 'aa000005-aa05-aa05-aa05-000000000004',
        label: 'Medical Specialty',
        type: 'select',
        required: false,
        order: 3,
        options: [
          { value: 'field_medic', label: 'Field Medic' },
          { value: 'chirurgeon', label: 'Chirurgeon' },
          { value: 'herbalist', label: 'Herbalist' },
          { value: 'battle_medic', label: 'Battle Medic' },
        ],
      },
      { id: 'aa000005-aa05-aa05-aa05-000000000005', label: 'Healing Kit Charges', type: 'number', required: false, order: 4, min: 0, max: 20 },
      { id: 'aa000005-aa05-aa05-aa05-000000000006', label: 'Healing Abilities', type: 'longtext', required: false, order: 5 },
    ],
  },
  {
    name: 'Berserker',
    genre: 'Fantasy',
    description: 'A rage-fueled warrior who draws power from fury and primal instinct.',
    type: 'class',
    fields: [
      { id: 'aa000006-aa06-aa06-aa06-000000000001', label: 'Level', type: 'number', required: true, order: 0, min: 1, max: 20 },
      { id: 'aa000006-aa06-aa06-aa06-000000000002', label: 'Hit Points', type: 'number', required: true, order: 1, min: 1 },
      { ...CORE_STATS, id: 'aa000006-aa06-aa06-aa06-000000000003' },
      {
        id: 'aa000006-aa06-aa06-aa06-000000000004',
        label: 'Primal Path',
        type: 'select',
        required: false,
        order: 3,
        options: [
          { value: 'berserker', label: 'Path of the Berserker' },
          { value: 'totem', label: 'Path of the Totem Warrior' },
          { value: 'wild_magic', label: 'Path of Wild Magic' },
          { value: 'beast', label: 'Path of the Beast' },
        ],
      },
      { id: 'aa000006-aa06-aa06-aa06-000000000005', label: 'Rage Charges', type: 'number', required: false, order: 4, min: 0, max: 10 },
      { id: 'aa000006-aa06-aa06-aa06-000000000006', label: 'Brutal Abilities', type: 'longtext', required: false, order: 5 },
    ],
  },
  {
    name: 'Paladin',
    genre: 'Fantasy',
    description: 'A holy warrior bound by sacred oaths, wielding divine power in service of their cause.',
    type: 'class',
    fields: [
      { id: 'aa000007-aa07-aa07-aa07-000000000001', label: 'Level', type: 'number', required: true, order: 0, min: 1, max: 20 },
      { id: 'aa000007-aa07-aa07-aa07-000000000002', label: 'Hit Points', type: 'number', required: true, order: 1, min: 1 },
      { ...CORE_STATS, id: 'aa000007-aa07-aa07-aa07-000000000003' },
      {
        id: 'aa000007-aa07-aa07-aa07-000000000004',
        label: 'Sacred Oath',
        type: 'select',
        required: false,
        order: 3,
        options: [
          { value: 'devotion', label: 'Oath of Devotion' },
          { value: 'ancients', label: 'Oath of the Ancients' },
          { value: 'vengeance', label: 'Oath of Vengeance' },
          { value: 'conquest', label: 'Oath of Conquest' },
          { value: 'oathbreaker', label: 'Oathbreaker' },
        ],
      },
      { id: 'aa000007-aa07-aa07-aa07-000000000005', label: 'Lay on Hands Pool', type: 'number', required: false, order: 4, min: 0, max: 50 },
      { id: 'aa000007-aa07-aa07-aa07-000000000006', label: 'Divine Abilities', type: 'longtext', required: false, order: 5 },
    ],
  },
]

const BUILTIN_TEMPLATES = [...RACE_TEMPLATES, ...CLASS_TEMPLATES]

export async function seedBuiltinTemplates() {
  for (const template of BUILTIN_TEMPLATES) {
    const [existing] = await db
      .select({ id: schemaTemplates.id })
      .from(schemaTemplates)
      .where(and(eq(schemaTemplates.name, template.name), eq(schemaTemplates.isBuiltin, true)))

    if (existing) {
      await db
        .update(schemaTemplates)
        .set({ fields: template.fields, description: template.description, type: template.type })
        .where(eq(schemaTemplates.id, existing.id))
    } else {
      await db.insert(schemaTemplates).values({ ...template, isBuiltin: true })
    }
  }
}
