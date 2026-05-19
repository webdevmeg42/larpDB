export interface Game {
  id: string
  name: string
  description: string | null
  createdAt: string
}

export interface GameCodex {
  eventName?: string
  eventTagline?: string
  eventAbout?: string
  eventDates?: string
  locationName?: string
  keyTimes?: string
  travelNotes?: string
  genre?: string
  tone?: string
  worldLore?: string
  factions?: string
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
  fontHeading: string
  fontBody: string
  welcomeMessage: string | null
  footerText: string | null
  customCss: string | null
  codex: GameCodex | null
  currencyName: string
  updatedAt: string
}
