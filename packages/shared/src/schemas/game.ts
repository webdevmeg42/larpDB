import { z } from 'zod'

export const CreateGameInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  isPublic: z.boolean().optional().default(true),
  joinMode: z.enum(['open', 'approval']).optional().default('open'),
})

export const UpdateMemberInput = z.object({
  role: z.enum(['owner', 'gm', 'player']).optional(),
  status: z.enum(['active', 'pending', 'banned']).optional(),
})

export const UpdateGameStatusInput = z.object({
  status: z.enum(['active', 'disabled']),
})

export type CreateGameInput = z.infer<typeof CreateGameInput>
export type UpdateMemberInput = z.infer<typeof UpdateMemberInput>
export type UpdateGameStatusInput = z.infer<typeof UpdateGameStatusInput>

const RulebookChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  order: z.number().int(),
})

export const GameCodexSchema = z.object({
  eventName: z.string().optional(),
  eventTagline: z.string().optional(),
  eventAbout: z.string().optional(),
  eventStartDate: z.string().optional(),
  eventEndDate: z.string().optional(),
  locationName: z.string().optional(),
  keyTimes: z.string().optional(),
  travelNotes: z.string().optional(),
  genre: z.string().optional(),
  tone: z.string().optional(),
  worldLore: z.string().optional(),
  factions: z.string().optional(),
  safetyMechanics: z.string().optional(),
  contentWarnings: z.string().optional(),
  registrationInfo: z.string().optional(),
  rulebookLink: z.string().optional(),
  classesInfo: z.string().optional(),
  prebuiltCharacters: z.string().optional(),
  whatToBring: z.string().optional(),
  whatProvided: z.string().optional(),
  ticketTiers: z.string().optional(),
  registrationOpenDate: z.string().optional(),
  registrationCloseDate: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  organizerTeam: z.string().optional(),
  contactEmail: z.string().email().optional(),
  socialMedia: z.string().optional(),
  npcCall: z.string().optional(),
  ageRestrictions: z.string().optional(),
  codeOfConduct: z.string().optional(),
  liabilityWaiver: z.string().optional(),
  faq: z.string().optional(),
  testimonials: z.string().optional(),
  mediaLinks: z.string().optional(),
  sponsors: z.string().optional(),
  anythingElse: z.string().optional(),
  rulebook: z.object({ chapters: z.array(RulebookChapterSchema) }).optional(),
})

export type GameCodexInput = z.infer<typeof GameCodexSchema>

export const UpdateSiteConfigInput = z.object({
  siteTitle: z.string().min(1).max(200).optional(),
  tagline: z.string().max(300).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  colorPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  colorSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  colorBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  colorText: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  colorAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontHeading: z.string().min(1).max(100).optional(),
  fontBody: z.string().min(1).max(100).optional(),
  welcomeMessage: z.string().max(2000).nullable().optional(),
  footerText: z.string().max(500).nullable().optional(),
  customCss: z.string().max(10000).nullable().optional(),
  codex: GameCodexSchema.nullable().optional(),
  currencyName: z.string().min(1).max(100).optional(),
})

export type UpdateSiteConfigInput = z.infer<typeof UpdateSiteConfigInput>
