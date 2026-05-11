import { z } from 'zod';
export const SchemaFieldOptionSchema = z.object({
    value: z.string().min(1),
    label: z.string().min(1),
    xpCost: z.number().int().min(0).optional(),
});
export const StatBlockStatSchema = z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
    xpCostPerPoint: z.number().int().min(0).optional(),
});
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
});
//# sourceMappingURL=character.js.map