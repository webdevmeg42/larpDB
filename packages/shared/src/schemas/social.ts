import { z } from 'zod'

export const CreatePostInput = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
  mediaType: z.enum(['photo', 'video']).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  status: z.enum(['draft', 'published']).optional(),
}).superRefine((data, ctx) => {
  if (data.mediaType === 'photo') {
    if (!data.mediaUrls || data.mediaUrls.length < 1 || data.mediaUrls.length > 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Photo posts require 1–8 URLs',
        path: ['mediaUrls'],
      })
    }
  } else if (data.mediaType === 'video') {
    if (!data.mediaUrls || data.mediaUrls.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Video posts require exactly 1 URL',
        path: ['mediaUrls'],
      })
    }
  } else if (!data.mediaType && data.mediaUrls && data.mediaUrls.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'mediaUrls provided without mediaType',
      path: ['mediaUrls'],
    })
  }
})
export type CreatePostInput = z.infer<typeof CreatePostInput>

export const UpdatePostInput = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(10000).optional(),
  mediaType: z.enum(['photo', 'video']).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  status: z.enum(['draft', 'published']).optional(),
})
export type UpdatePostInput = z.infer<typeof UpdatePostInput>

export const CreateCommentInput = z.object({
  body: z.string().min(1).max(2000),
})
export type CreateCommentInput = z.infer<typeof CreateCommentInput>

export const SubscribeInput = z.object({
  gameId: z.string().uuid(),
})
export type SubscribeInput = z.infer<typeof SubscribeInput>
