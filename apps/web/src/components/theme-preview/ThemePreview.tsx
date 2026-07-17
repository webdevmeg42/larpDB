'use client'

import { useEffect } from 'react'
import { FONTS, loadFont } from '@/lib/fonts'
import { getContrastColor } from '@/lib/contrast'

interface ThemePreviewProps {
  form: {
    siteTitle?: string
    tagline?: string | null
    colorPrimary?: string
    colorSecondary?: string
    colorBackground?: string
    colorAccent?: string
    fontHeading?: string
    fontBody?: string
    welcomeMessage?: string | null
    footerText?: string | null
  }
}

export default function ThemePreview({ form }: ThemePreviewProps) {
  const {
    siteTitle = 'My Adventure',
    tagline,
    colorPrimary = '#6366f1',
    colorSecondary = '#a78bfa',
    colorBackground = '#0f0f1a',
    colorAccent = '#f59e0b',
    fontHeading = 'Inter',
    fontBody = 'Inter',
    welcomeMessage,
    footerText,
  } = form

  const headingFont = FONTS.find(f => f.name === fontHeading)
  const bodyFont = FONTS.find(f => f.name === fontBody)

  useEffect(() => {
    if (headingFont) loadFont(headingFont.googleFamily)
  }, [headingFont])

  useEffect(() => {
    if (bodyFont) loadFont(bodyFont.googleFamily)
  }, [bodyFont])

  const headingFamily = headingFont?.family ?? `'${fontHeading}', sans-serif`
  const bodyFamily = bodyFont?.family ?? `'${fontBody}', sans-serif`

  const navTextColor = getContrastColor(colorPrimary)
  const bodyTextColor = getContrastColor(colorBackground)
  const buttonTextColor = getContrastColor(colorAccent)
  const footerTextColor = getContrastColor(colorSecondary)

  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-sm">
      <div className="px-3 py-2 bg-muted text-xs text-muted-foreground font-medium flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
        Live Preview
      </div>
      <div style={{ background: colorBackground }}>
        {/* Nav bar */}
        <div style={{ background: colorPrimary, padding: '10px 16px' }}>
          <span style={{ color: navTextColor, fontWeight: 700, fontSize: '0.9rem', fontFamily: headingFamily }}>
            {siteTitle}
          </span>
        </div>

        {/* Hero */}
        <div style={{ padding: '20px 16px', borderBottom: `1px solid ${colorSecondary}33` }}>
          <h2 style={{ fontFamily: headingFamily, color: bodyTextColor, fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>
            {siteTitle}
          </h2>
          {tagline && (
            <p style={{ fontFamily: bodyFamily, color: bodyTextColor, opacity: 0.7, fontSize: '0.85rem', marginBottom: '12px' }}>
              {tagline}
            </p>
          )}
          <button
            type="button"
            style={{ background: colorAccent, color: buttonTextColor, fontFamily: bodyFamily, fontWeight: 700, padding: '6px 14px', borderRadius: '4px', border: 'none', fontSize: '0.78rem', cursor: 'default' }}
          >
            Join Now
          </button>
        </div>

        {/* Body sample */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${colorSecondary}33` }}>
          <p style={{ fontFamily: bodyFamily, color: bodyTextColor, opacity: 0.8, fontSize: '0.8rem', lineHeight: 1.6 }}>
            {welcomeMessage ?? 'Your welcome message will appear here, displayed to players on their dashboard.'}
          </p>
        </div>

        {/* Footer */}
        <div style={{ background: colorSecondary, padding: '8px 16px' }}>
          <span style={{ fontFamily: bodyFamily, color: footerTextColor, fontSize: '0.7rem', opacity: 0.9 }}>
            {footerText ?? siteTitle}
          </span>
        </div>
      </div>
    </div>
  )
}
