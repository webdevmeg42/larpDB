'use client'

import Link from 'next/link'
import { useLarpContext } from '@/contexts/LarpContext'
import { getContrastColor } from '@/lib/contrast'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function LarpPublicShell({ title, subtitle, children }: Props) {
  const { data, theme } = useLarpContext()
  const { colorPrimary, colorBackground, headingFamily, bodyFamily } = theme

  const navTextColor = getContrastColor(colorPrimary)
  const bodyTextColor = getContrastColor(colorBackground)

  return (
    <div className="min-h-screen" style={{ background: colorBackground, color: bodyTextColor, fontFamily: bodyFamily }}>
      <div
        className="px-6 py-3 flex items-center gap-2 text-sm"
        style={{ background: colorPrimary, color: navTextColor }}
      >
        <Link
          href={`/larps/${data.slug}`}
          className="hover:opacity-80 transition-opacity"
          style={{ color: navTextColor }}
        >
          ← {data.siteTitle}
        </Link>
        <span style={{ opacity: 0.5 }}>/</span>
        <span className="font-medium" style={{ color: navTextColor }}>{title}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: headingFamily, color: bodyTextColor }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: bodyTextColor, opacity: 0.7 }}>
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
