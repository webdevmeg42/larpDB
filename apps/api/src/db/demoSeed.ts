import { sql } from 'drizzle-orm'
import { db } from './index.js'
import {
  siteConfig,
  characterSchemas,
  characters,
  xpTransactions,
  events,
  eventRegistrations,
} from './schema.js'
import type { SchemaField } from '@plotrunner/shared'

// Fixed field IDs so character data keys match the schema
const FIELD_IDS = {
  hp:     'd0000001-0000-0000-0000-000000000001',
  stats:  'd0000001-0000-0000-0000-000000000002',
  skills: 'd0000001-0000-0000-0000-000000000003',
  lineage:'d0000001-0000-0000-0000-000000000004',
  blessed:'d0000001-0000-0000-0000-000000000005',
}

const DEMO_FIELDS: SchemaField[] = [
  {
    id: FIELD_IDS.hp,
    label: 'Hit Points',
    type: 'hitpoints',
    required: true,
    order: 0,
    max: 60,
  },
  {
    id: FIELD_IDS.stats,
    label: 'Core Stats',
    type: 'statblock',
    required: false,
    order: 1,
    stats: [
      { key: 'str', label: 'STR', min: 8, max: 20, xpCostPerPoint: 2 },
      { key: 'dex', label: 'DEX', min: 8, max: 20, xpCostPerPoint: 2 },
      { key: 'int', label: 'INT', min: 8, max: 20, xpCostPerPoint: 2 },
      { key: 'wis', label: 'WIS', min: 8, max: 20, xpCostPerPoint: 2 },
    ],
  },
  {
    id: FIELD_IDS.skills,
    label: 'Skills',
    type: 'statblock',
    required: false,
    order: 2,
    stats: [
      { key: 'archery',   label: 'Archery',   min: 0, max: 6, xpCostPerPoint: 5 },
      { key: 'stealth',   label: 'Stealth',   min: 0, max: 6, xpCostPerPoint: 5 },
      { key: 'lore',      label: 'Lore',      min: 0, max: 6, xpCostPerPoint: 5 },
      { key: 'smithing',  label: 'Smithing',  min: 0, max: 6, xpCostPerPoint: 5 },
      { key: 'herbalism', label: 'Herbalism', min: 0, max: 6, xpCostPerPoint: 5 },
    ],
  },
  {
    id: FIELD_IDS.lineage,
    label: 'Lineage',
    type: 'select',
    required: false,
    order: 3,
    options: [
      { value: 'human',    label: 'Human' },
      { value: 'elf',      label: 'Elf' },
      { value: 'dwarf',    label: 'Dwarf' },
      { value: 'half-orc', label: 'Half-Orc' },
    ],
  },
  {
    id: FIELD_IDS.blessed,
    label: 'Blessed by the Forest',
    type: 'toggle',
    required: false,
    order: 4,
  },
]

export async function seedDemoGame(userId: string, gameId: string) {
  // Site config
  await db.insert(siteConfig).values({
    gameId,
    siteTitle: 'Thornwood Chronicles',
    tagline: 'A medieval fantasy LARP set in the cursed forest of Thornwood',
  })

  // Character schema
  const [schema] = await db.insert(characterSchemas).values({
    gameId,
    name: 'Thornwood Character',
    version: 1,
    fields: DEMO_FIELDS,
    isActive: true,
    type: 'race',
  }).returning()
  if (!schema) throw new Error('Failed to create demo schema')

  // Characters
  const [aelindra] = await db.insert(characters).values({
    gameId,
    userId,
    schemaId: schema.id,
    name: 'Aelindra Moonwhisper',
    totalXp: 500,
    data: {
      [FIELD_IDS.hp]:     { current: 43, max: 60 },
      [FIELD_IDS.stats]:  { str: 12, dex: 16, int: 14, wis: 13 },
      [FIELD_IDS.skills]: { archery: 4, stealth: 3, lore: 2, smithing: 0, herbalism: 1 },
      [FIELD_IDS.lineage]: 'elf',
      [FIELD_IDS.blessed]: true,
    },
  }).returning()

  const [brom] = await db.insert(characters).values({
    gameId,
    userId,
    schemaId: schema.id,
    name: 'Brom Ironforge',
    totalXp: 320,
    data: {
      [FIELD_IDS.hp]:     { current: 60, max: 60 },
      [FIELD_IDS.stats]:  { str: 18, dex: 10, int: 11, wis: 12 },
      [FIELD_IDS.skills]: { archery: 0, stealth: 0, lore: 1, smithing: 5, herbalism: 0 },
      [FIELD_IDS.lineage]: 'dwarf',
      [FIELD_IDS.blessed]: false,
    },
  }).returning()

  const [cassiel] = await db.insert(characters).values({
    gameId,
    userId,
    schemaId: schema.id,
    name: 'Cassiel the Wanderer',
    totalXp: 900,
    data: {
      [FIELD_IDS.hp]:     { current: 35, max: 60 },
      [FIELD_IDS.stats]:  { str: 10, dex: 12, int: 18, wis: 16 },
      [FIELD_IDS.skills]: { archery: 1, stealth: 2, lore: 6, smithing: 0, herbalism: 3 },
      [FIELD_IDS.lineage]: 'human',
      [FIELD_IDS.blessed]: false,
    },
  }).returning()

  if (!aelindra || !brom || !cassiel) throw new Error('Failed to create demo characters')

  // XP transactions (gives realistic totalXp split)
  await db.insert(xpTransactions).values([
    { characterId: aelindra.id, awardedBy: userId, amount: 300, reason: 'The Siege of Thornwall', type: 'award' },
    { characterId: aelindra.id, awardedBy: userId, amount: 200, reason: 'Midwinter Moot', type: 'award' },
    { characterId: aelindra.id, awardedBy: userId, amount: -253, reason: 'Skill purchases', type: 'spend' },
    { characterId: brom.id,     awardedBy: userId, amount: 200, reason: 'The Siege of Thornwall', type: 'award' },
    { characterId: brom.id,     awardedBy: userId, amount: 120, reason: 'Midwinter Moot', type: 'award' },
    { characterId: brom.id,     awardedBy: userId, amount: -240, reason: 'Skill purchases', type: 'spend' },
    { characterId: cassiel.id,  awardedBy: userId, amount: 500, reason: 'The Siege of Thornwall', type: 'award' },
    { characterId: cassiel.id,  awardedBy: userId, amount: 400, reason: 'Midwinter Moot', type: 'award' },
    { characterId: cassiel.id,  awardedBy: userId, amount: -388, reason: 'Skill purchases', type: 'spend' },
  ])

  // Events
  const past1StartAt = new Date('2025-06-14T10:00:00Z')
  const past1EndAt   = new Date('2025-06-15T18:00:00Z')
  const past2StartAt = new Date('2025-12-20T10:00:00Z')
  const past2EndAt   = new Date('2025-12-21T18:00:00Z')
  const futureStartAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const [siege] = await db.insert(events).values({
    gameId,
    title: 'The Siege of Thornwall',
    tagline: 'The cursed fortress must fall.',
    location: 'Blackmoor Forest Reserve',
    startAt: past1StartAt,
    endAt: past1EndAt,
    maxPlayers: 20,
    status: 'archived',
  }).returning()

  const [moot] = await db.insert(events).values({
    gameId,
    title: 'Midwinter Moot',
    tagline: 'Gather, feast, and plan the season ahead.',
    location: 'The Hearthstone Inn, Thornwood',
    startAt: past2StartAt,
    endAt: past2EndAt,
    maxPlayers: 12,
    status: 'archived',
  }).returning()

  const [reckoning] = await db.insert(events).values({
    gameId,
    title: 'The Reckoning',
    tagline: 'All debts come due beneath the blood moon.',
    location: 'Thornwood Clearing',
    startAt: futureStartAt,
    maxPlayers: 20,
    status: 'published',
  }).returning()

  if (!siege || !moot || !reckoning) throw new Error('Failed to create demo events')

  // Event registrations (all 3 characters registered for past events)
  await db.insert(eventRegistrations).values([
    { eventId: siege.id,     userId, characterId: aelindra.id, status: 'confirmed' },
    { eventId: siege.id,     userId, characterId: brom.id,     status: 'confirmed' },
    { eventId: moot.id,      userId, characterId: aelindra.id, status: 'confirmed' },
    { eventId: moot.id,      userId, characterId: cassiel.id,  status: 'confirmed' },
    { eventId: reckoning.id, userId, characterId: aelindra.id, status: 'pending' },
  ])

  // Store items — use raw SQL because schema.ts is behind the actual DB schema for store_items
  // (storeDev migration added game_id, item_type, price_usd and dropped price)
  await db.execute(sql`
    INSERT INTO store_items (game_id, event_id, name, description, item_type, price_usd, is_available)
    VALUES
      (${gameId}, ${reckoning.id}, 'Healing Potion', 'Restores 10 HP instantly.', 'item', 5,  true),
      (${gameId}, ${reckoning.id}, 'Silver Blade',   'Effective against undead.',  'item', 20, true),
      (${gameId}, ${reckoning.id}, 'Forest Cloak',   '+2 to Stealth checks.',      'item', 15, true),
      (${gameId}, ${reckoning.id}, 'Lorebook',       'Grants access to the Thornwood codex.', 'item', 10, true)
  `)
}
