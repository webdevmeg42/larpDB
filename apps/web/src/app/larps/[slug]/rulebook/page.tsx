'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { LarpPublicShell } from '../_components/LarpPublicShell'
import type { RulebookChapter } from '@larpdb/shared'

interface RulebookData {
  rulebookLink: string | null
  chapters: RulebookChapter[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function PublicRulebookPage() {
  const params = useParams<{ slug: string }>()
  const [data, setData] = useState<RulebookData | null>(null)
  const [larpName, setLarpName] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [publicRes, bookRes] = await Promise.all([
          fetch(`${API_BASE}/games/${params.slug}/public`),
          fetch(`${API_BASE}/games/${params.slug}/rulebook`),
        ])
        if (publicRes.status === 404 || bookRes.status === 404) { setNotFound(true); return }
        const pub = await publicRes.json() as { siteTitle: string }
        const book = await bookRes.json() as RulebookData
        setLarpName(pub.siteTitle)
        setData(book)
        if (book.chapters.length > 0) setActiveId(book.chapters[0].id)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.slug])

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (notFound || !data) return <div className="p-6">LARP not found.</div>

  // Link-only mode
  if (data.chapters.length === 0 && data.rulebookLink) {
    return (
      <LarpPublicShell larpName={larpName} larpSlug={params.slug} title="Rulebook" subtitle="Game mechanics">
        <div className="rounded-lg border p-8 text-center">
          <a
            href={data.rulebookLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline"
          >
            View Rulebook →
          </a>
        </div>
      </LarpPublicShell>
    )
  }

  const activeChapter = data.chapters.find(c => c.id === activeId) ?? data.chapters[0]

  return (
    <LarpPublicShell larpName={larpName} larpSlug={params.slug} title="Rulebook" subtitle="Game mechanics">
      {data.rulebookLink && (
        <p className="text-xs text-muted-foreground mb-4">
          Also available externally:{' '}
          <a href={data.rulebookLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {data.rulebookLink}
          </a>
        </p>
      )}
      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-44 flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chapters</p>
          <div className="space-y-1">
            {data.chapters.map(ch => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveId(ch.id)}
                className={`w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors ${
                  ch.id === activeId
                    ? 'bg-muted font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {ch.order + 1}. {ch.title}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        {activeChapter && (
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-4">{activeChapter.order + 1}. {activeChapter.title}</h2>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: activeChapter.content }}
            />
          </div>
        )}
      </div>
    </LarpPublicShell>
  )
}
