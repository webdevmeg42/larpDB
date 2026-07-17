import { z } from 'zod'

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
})

export type LoginInput = z.infer<typeof LoginInput>
export type RegisterInput = z.infer<typeof RegisterInput>
