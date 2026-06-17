import { z } from 'zod'

export const CreatePostInput = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
})
export type CreatePostInput = z.infer<typeof CreatePostInput>

export const CreateCommentInput = z.object({
  body: z.string().min(1).max(2000),
})
export type CreateCommentInput = z.infer<typeof CreateCommentInput>

export const SubscribeInput = z.object({
  gameId: z.string().uuid(),
})
export type SubscribeInput = z.infer<typeof SubscribeInput>
