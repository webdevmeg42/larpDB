import { z } from 'zod'

export const CreateStoreItemInput = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().int().min(0),
  quantityAvailable: z.number().int().min(1).nullable().optional(),
  isAvailable: z.boolean().optional(),
})
export type CreateStoreItemInput = z.infer<typeof CreateStoreItemInput>

export const UpdateStoreItemInput = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().int().min(0).optional(),
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
