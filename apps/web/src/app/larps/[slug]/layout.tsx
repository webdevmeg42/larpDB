'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { LarpContext, LarpPublicData, buildTheme } from '@/contexts/LarpContext'
import { FONTS, loadFont } from '@/lib/fonts'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function LarpLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug: string }>()
  const [data, setData] = useState<LarpPublicData | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/games/${params.slug}/public`)
        if (res.status === 404) { setNotFound(true); return }
        if (!res.ok) throw new Error('Failed to load')
        const json = await res.json() as LarpPublicData
        setData(json)
      } catch {
        setNotFound(true)
      }
    }
    void load()
  }, [params.slug])

  useEffect(() => {
    if (!data) return
    const hf = FONTS.find(f => f.name === data.fontHeading)
    const bf = FONTS.find(f => f.name === data.fontBody)
    if (hf) loadFont(hf.googleFamily)
    if (bf) loadFont(bf.googleFamily)
  }, [data?.fontHeading, data?.fontBody])

  if (notFound) return <div className="p-6">LARP not found.</div>
  if (!data) return <div className="p-6 text-muted-foreground">Loading…</div>

  const theme = buildTheme(data)

  return (
    <LarpContext.Provider value={{ data, theme }}>
      {children}
    </LarpContext.Provider>
  )
}
