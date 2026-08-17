export type GameMemberRole = 'owner' | 'gm' | 'player'
export type GameMemberStatus = 'active' | 'pending' | 'banned'
export type GameJoinMode = 'open' | 'approval'
export type GameStatus = 'active' | 'inactive'

export interface Game {
  id: string
  name: string
  description: string | null
  slug: string
  isPublic: boolean
  joinMode: GameJoinMode
  status: GameStatus
  createdAt: string
}

export interface MyGame extends Game {
  memberCount: number
  role: GameMemberRole
}

export interface AdminGame extends Game {
  memberCount: number
  ownerId: string | null
  ownerDisplayName: string | null
  ownerIsBlocked: boolean | null
  isBlocked: boolean
}

export interface GameMember {
  id: string
  gameId: string
  userId: string
  role: GameMemberRole
  status: GameMemberStatus
  joinedAt: string
}

export interface RulebookChapter {
  id: string
  title: string
  content: string
  order: number
}

export type LevelingSystemType =
  | 'fibonacci'
  | 'linear'
  | 'flat'
  | 'doubling'
  | 'triangular'
  | 'percentage'

export interface Faction {
  name: string
  description: string
}

export interface AdditionalWebsite {
  label: string
  url: string
}

export interface GameCodex {
  socialFacebook?: string
  socialInstagram?: string
  socialSnapchat?: string
  socialTikTok?: string
  socialBluesky?: string
  socialSubstack?: string
  socialTwitter?: string
  socialDiscord?: string
  additionalWebsites?: AdditionalWebsite[]
  levelingSystem?: LevelingSystemType
  maxLevel?: number
  baseLevel?: number
  linearIncrement?: number
  flatCost?: number
  eventName?: string
  eventTagline?: string
  eventAbout?: string
  eventStartDate?: string
  eventEndDate?: string
  locationName?: string
  keyTimes?: string
  travelNotes?: string
  genre?: string
  tone?: string
  worldLore?: string
  factions?: Faction[]
  safetyMechanics?: string
  contentWarnings?: string
  registrationInfo?: string
  rulebookLink?: string
  classesInfo?: string
  prebuiltCharacters?: string
  whatToBring?: string
  whatProvided?: string
  ticketTiers?: string
  registrationOpenDate?: string
  registrationCloseDate?: string
  cancellationPolicy?: string
  organizerTeam?: string
  contactEmail?: string
  socialMedia?: string
  npcCall?: string
  ageRestrictions?: string
  codeOfConduct?: string
  liabilityWaiver?: string
  faq?: string
  testimonials?: string
  mediaLinks?: string
  sponsors?: string
  anythingElse?: string
  rulebook?: {
    chapters: RulebookChapter[]
  }
}

export interface SiteConfig {
  id: string
  gameId: string
  siteTitle: string
  tagline: string | null
  logoUrl: string | null
  faviconUrl: string | null
  bannerUrl: string | null
  colorPrimary: string
  colorSecondary: string
  colorBackground: string
  colorText: string
  colorAccent: string
  themeName: string | null
  fontHeading: string
  fontBody: string
  welcomeMessage: string | null
  footerText: string | null
  customCss: string | null
  codex: GameCodex | null
  currencyName: string
  showDirectory: boolean
  updatedAt: string
}
