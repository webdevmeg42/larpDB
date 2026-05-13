import { z } from 'zod'

export const CreatePlotInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  linkedEventIds: z.array(z.string().uuid()).optional().default([]),
})

export const UpdatePlotInput = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(['active', 'resolved']).optional(),
  linkedEventIds: z.array(z.string().uuid()).optional(),
})

export type CreatePlotInput = z.infer<typeof CreatePlotInput>
export type UpdatePlotInput = z.infer<typeof UpdatePlotInput>
