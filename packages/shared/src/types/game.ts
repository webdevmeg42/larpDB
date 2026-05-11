export interface Game {
  id: string
  name: string
  description: string | null
  createdAt: string
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
  updatedAt: string
}
