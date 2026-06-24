'use client'

import Link from 'next/link'

interface Props {
  larpName: string
  larpSlug: string
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function LarpPublicShell({ larpName, larpSlug, title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-3 flex items-center gap-2 text-sm">
        <Link href={`/larps/${larpSlug}`} className="text-muted-foreground hover:text-foreground">
          ← {larpName}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{title}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
