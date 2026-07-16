'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { api } from '@/lib/api'
import { getGameId, setGameId } from '@/lib/auth'
import { AdventurePanel } from '@/components/layout/AdventurePanel'
import dynamic from 'next/dynamic'

const RulebookTab = dynamic(
  () => import('../adventures/_components/RulebookTab'),
  { ssr: false },
)

interface MyGame {
  id: string
  name: string
  slug: string
  role: string
  status: string
}

export default function RulebookPage() {
  const { user } = useAuth()
  const { config, reload } = useSiteConfig()
  const [games, setGames] = useState<MyGame[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    api.get<MyGame[]>('/my-games')
      .then(all => {
        setGames(all)
        if (all.length > 0) {
          const saved = getGameId()
          const initial = all.find(g => g.id === saved) ?? all[0]!
          setSelectedGameId(initial.id)
          setGameId(initial.id)
          reload()
        }
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  // reload changes every render — including it in deps would cause an infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function handleSelect(id: string) {
    setSelectedGameId(id)
    setGameId(id)
    setActiveChapterId(null)
    reload()
  }

  function scrollToChapter(id: string) {
    setActiveChapterId(id)
    document.getElementById(`chapter-${id}`)?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!user) return null

  if (loading) {
    return <p className="p-6 text-muted-foreground">Loading…</p>
  }

  if (games.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">You haven&apos;t joined any Adventures yet.</p>
      </div>
    )
  }

  const selectedGame = games.find(g => g.id === selectedGameId) ?? null
  const isEditorRole = selectedGame?.role === 'owner' || selectedGame?.role === 'gm'
  const chapters = config?.codex?.rulebook?.chapters ?? []
  const rulebookLink = config?.codex?.rulebookLink

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Rulebook</h1>

      <div className="flex gap-4 min-h-[400px]">
        <AdventurePanel
          games={games}
          selectedId={selectedGameId}
          onSelect={handleSelect}
        />

        <div className="flex-1 overflow-hidden">
          {!selectedGameId ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-muted-foreground">Select an Adventure to view its rulebook.</p>
            </div>
          ) : isEditorRole ? (
            <RulebookTab config={config} reload={reload} />
          ) : (
            /* Player reader — same content as /rulebook/[slug] player view */
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: '400px' }}>
              {/* Sticky ToC */}
              <nav
                aria-label="Table of contents"
                style={{
                  width: '200px',
                  flexShrink: 0,
                  background: 'hsl(var(--background))',
                  borderRight: '1px solid hsl(var(--border))',
                  overflowY: 'auto',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contents
                </div>
                {chapters.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>No chapters yet.</p>
                )}
                {chapters.map(ch => {
                  const isActive = activeChapterId === ch.id || (activeChapterId === null && chapters[0]?.id === ch.id)
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => scrollToChapter(ch.id)}
                      aria-current={isActive ? 'true' : undefined}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '4px 8px',
                        border: 'none',
                        borderLeft: isActive ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                        color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        fontWeight: isActive ? 500 : 400,
                        fontSize: '13px',
                        marginBottom: '4px',
                        background: 'none',
                        cursor: 'pointer',
                        lineHeight: '1.4',
                      }}
                    >
                      {ch.order + 1}. {ch.title}
                    </button>
                  )
                })}
              </nav>

              {/* Reading area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                  {rulebookLink && (
                    <a
                      href={rulebookLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginBottom: '16px', fontSize: '14px', color: 'hsl(var(--primary))', textDecoration: 'none' }}
                    >
                      ↗ View external rulebook
                    </a>
                  )}
                  {chapters.length === 0 && (
                    <div style={{ border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '24px', color: 'hsl(var(--muted-foreground))' }}>
                      No rulebook chapters have been added yet.
                    </div>
                  )}
                  {chapters.map(ch => (
                    <section
                      key={ch.id}
                      id={`chapter-${ch.id}`}
                      style={{ scrollMarginTop: '24px', marginBottom: '24px' }}
                    >
                      <div style={{ border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: 0, marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid hsl(var(--border))' }}>
                          {ch.order + 1}. {ch.title}
                        </h2>
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: ch.content }}
                        />
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
