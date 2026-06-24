import { z } from 'zod'

export const CreateEventInput = z.object({
  title: z.string().min(1).max(200),
  tagline: z.string().max(500).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  keyTimes: z.string().max(1000).nullable().optional(),
  travelNotes: z.string().max(2000).nullable().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  maxPlayers: z.number().int().positive().nullable().optional(),
})

export const UpdateEventInput = z.object({
  title: z.string().min(1).max(200).optional(),
  tagline: z.string().max(500).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  keyTimes: z.string().max(1000).nullable().optional(),
  travelNotes: z.string().max(2000).nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  maxPlayers: z.number().int().positive().nullable().optional(),
})

export const RegisterForEventInput = z.object({
  characterId: z.string().uuid().optional(),
})

export const UpdateRegistrationInput = z.object({
  status: z.enum(['pending', 'confirmed', 'waitlist', 'cancelled']),
})

export type CreateEventInput = z.infer<typeof CreateEventInput>
export type UpdateEventInput = z.infer<typeof UpdateEventInput>
export type RegisterForEventInput = z.infer<typeof RegisterForEventInput>
export type UpdateRegistrationInput = z.infer<typeof UpdateRegistrationInput>
