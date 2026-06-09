import { z } from 'zod'

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
  type: z.enum(['text', 'longtext', 'number', 'select', 'multiselect', 'toggle', 'statblock', 'section']),
  required: z.boolean(),
  order: z.number().int().min(0),
  min: z.number().optional(),
  max: z.number().optional(),
  xpCostPerPoint: z.number().int().min(0).optional(),
  options: z.array(SchemaFieldOptionSchema).optional(),
  maxSelections: z.number().int().min(1).optional(),
  stats: z.array(StatBlockStatSchema).optional(),
  xpCost: z.number().int().min(0).optional(),
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
