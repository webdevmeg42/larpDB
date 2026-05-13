import { z } from 'zod'

export const CreateNpcInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  portraitUrl: z.string().url().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
})

export const UpdateNpcInput = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  portraitUrl: z.string().url().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
})

export type CreateNpcInput = z.infer<typeof CreateNpcInput>
export type UpdateNpcInput = z.infer<typeof UpdateNpcInput>
