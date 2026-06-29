'use client'

import { createContext, useContext } from 'react'
import { FONTS } from '@/lib/fonts'

export interface LarpPublicData {
  id: string
  name: string
  slug: string
  joinMode: string
  status: string
  siteTitle: string
  tagline: string | null
  logoUrl: string | null
  bannerUrl: string | null
  welcomeMessage: string | null
  showDirectory: boolean
  colorPrimary: string
  colorSecondary: string
  colorBackground: string
  colorText: string
  colorAccent: string
  fontHeading: string
  fontBody: string
  socialFacebook?: string
  socialInstagram?: string
  socialSnapchat?: string
  socialTikTok?: string
  socialBluesky?: string
  socialSubstack?: string
  socialTwitter?: string
  socialDiscord?: string
  additionalWebsites?: { label: string; url: string }[]
}

export interface LarpTheme {
  colorPrimary: string
  colorSecondary: string
  colorBackground: string
  colorText: string
  colorAccent: string
  headingFamily: string
  bodyFamily: string
}

export interface LarpContextValue {
  data: LarpPublicData
  theme: LarpTheme
}

export const LarpContext = createContext<LarpContextValue | null>(null)

export function useLarpContext(): LarpContextValue {
  const ctx = useContext(LarpContext)
  if (!ctx) throw new Error('useLarpContext must be used inside LarpLayout')
  return ctx
}

export function buildTheme(data: LarpPublicData): LarpTheme {
  const headingFont = FONTS.find(f => f.name === data.fontHeading)
  const bodyFont = FONTS.find(f => f.name === data.fontBody)
  return {
    colorPrimary: data.colorPrimary,
    colorSecondary: data.colorSecondary,
    colorBackground: data.colorBackground,
    colorText: data.colorText,
    colorAccent: data.colorAccent,
    headingFamily: headingFont?.family ?? `'${data.fontHeading}', sans-serif`,
    bodyFamily: bodyFont?.family ?? `'${data.fontBody}', sans-serif`,
  }
}
