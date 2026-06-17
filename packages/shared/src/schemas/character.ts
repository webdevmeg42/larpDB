import { z } from 'zod'

export const HitPointEntrySchema = z.object({
  level: z.number().int().min(1),
  hp: z.number().int().min(1),
})

export const AttackEntrySchema = z.object({
  kind: z.enum(['new', 'upgrade']),
  level: z.number().int().min(1),
  name: z.string(),
  attackName: z.string().optional(),
  hitPoints: z.number().int().min(0),
})

export const SpellEntrySchema = z.object({
  kind: z.enum(['new', 'upgrade']),
  level: z.number().int().min(1),
  name: z.string(),
  spellName: z.string().optional(),
  hitPoints: z.number().int().min(0),
  effects: z.string(),
})

export const SchemaFieldOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  xpCost: z.number().int().min(0).optional(),
})

export const StatBlockStatSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  xpCostPerPoint: z.number().int().min(0).optional(),
})

export const SchemaFieldSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
  type: z.enum(['text', 'longtext', 'number', 'select', 'multiselect', 'toggle', 'statblock', 'section', 'equipment', 'personality', 'features', 'influences', 'appearance', 'hitpoints', 'attacks', 'spells']),
  required: z.boolean(),
  order: z.number().int().min(0),
  locked: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  xpCostPerPoint: z.number().int().min(0).optional(),
  options: z.array(SchemaFieldOptionSchema).optional(),
  maxSelections: z.number().int().min(1).optional(),
  stats: z.array(StatBlockStatSchema).optional(),
  xpCost: z.number().int().min(0).optional(),
  equipmentSlots: z.number().int().min(0).max(20).optional(),
  treasureSlots: z.number().int().min(0).max(20).optional(),
  personalityTraitSlots: z.number().int().min(0).max(8).optional(),
  idealSlots: z.number().int().min(0).max(6).optional(),
  bondSlots: z.number().int().min(0).max(6).optional(),
  flawSlots: z.number().int().min(0).max(6).optional(),
  featureSlots: z.number().int().min(0).max(20).optional(),
  influenceSlots: z.number().int().min(0).max(10).optional(),
  languageSlots: z.number().int().min(0).max(10).optional(),
  hitPointEntries: z.array(HitPointEntrySchema).optional(),
  attackEntries: z.array(AttackEntrySchema).optional(),
  spellEntries: z.array(SpellEntrySchema).optional(),
})

export const CreateCharacterSchemaInput = z.object({
  name: z.string().min(1).max(200),
  fields: z.array(SchemaFieldSchema),
  templateSource: z.string().uuid().nullish(),
  type: z.enum(['race', 'class']).default('race'),
})

export const UpdateCharacterSchemaInput = z.object({
  name: z.string().min(1).max(200).optional(),
  fields: z.array(SchemaFieldSchema).min(1).optional(),
})

export const CreateCharacterInput = z.object({
  name: z.string().min(1).max(200),
  portraitUrl: z.string().url().optional(),
  data: z.record(z.unknown()).optional().default({}),
})

export const UpdateCharacterInput = z.object({
  name: z.string().min(1).max(200).optional(),
  portraitUrl: z.string().url().nullable().optional(),
  data: z.record(z.unknown()).optional(),
})

export const AwardXPInput = z.object({
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
})

export const SpendXPInput = z.object({
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
})

export type SchemaFieldInput = z.infer<typeof SchemaFieldSchema>
export type CreateCharacterSchemaInput = z.infer<typeof CreateCharacterSchemaInput>
export type UpdateCharacterSchemaInput = z.infer<typeof UpdateCharacterSchemaInput>
export type CreateCharacterInput = z.infer<typeof CreateCharacterInput>
export type UpdateCharacterInput = z.infer<typeof UpdateCharacterInput>
export type AwardXPInput = z.infer<typeof AwardXPInput>
export type SpendXPInput = z.infer<typeof SpendXPInput>
