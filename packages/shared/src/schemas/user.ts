import { z } from 'zod'

export const UpdateProfileInput = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).max(30).nullable().optional(),
}).refine(
  d => d.displayName !== undefined || d.email !== undefined || d.phone !== undefined,
  { message: 'At least one field required' },
)

export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>

export const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(1),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>
