import { z } from 'zod'

export const STORE_ITEM_TYPES = ['ticket', 'xp', 'item', 'merchandise'] as const
export type StoreItemType = typeof STORE_ITEM_TYPES[number]

export const CreateStoreItemInput = z.object({
  eventId: z.string().uuid().optional(),
  itemType: z.enum(['ticket', 'xp', 'item', 'merchandise']),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  priceUsd: z.number().int().min(0),
  xpAmount: z.number().int().positive().optional(),
  quantityAvailable: z.number().int().min(1).nullable().optional(),
  isAvailable: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.itemType === 'ticket' && !data.eventId) {
    ctx.addIssue({ code: 'custom', path: ['eventId'], message: 'Ticket items require an event' })
  }
  if (data.itemType === 'xp' && !data.xpAmount) {
    ctx.addIssue({ code: 'custom', path: ['xpAmount'], message: 'XP items require an XP amount' })
  }
})
export type CreateStoreItemInput = z.infer<typeof CreateStoreItemInput>

export const UpdateStoreItemInput = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  priceUsd: z.number().int().min(0).optional(),
  xpAmount: z.number().int().positive().nullable().optional(),
  quantityAvailable: z.number().int().min(1).nullable().optional(),
  isAvailable: z.boolean().optional(),
})
export type UpdateStoreItemInput = z.infer<typeof UpdateStoreItemInput>

export const CreatePurchaseInput = z.object({
  storeItemId: z.string().uuid(),
  characterId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
})
export type CreatePurchaseInput = z.infer<typeof CreatePurchaseInput>
