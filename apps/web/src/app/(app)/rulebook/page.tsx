'use client'

import { useState } from 'react'
import { useSiteConfig } from '@/hooks/useSiteConfig'

export default function RulebookPage() {
  const { config, loading } = useSiteConfig()
  const [activeId, setActiveId] = useState<string | null>(null)

  const codex = config?.codex ?? {}
  const chapters = codex.rulebook?.chapters ?? []
  const rulebookLink = codex.rulebookLink

  function scrollToChapter(id: string) {
    setActiveId(id)
    document.getElementById(`chapter-${id}`)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div id="top" style={{ minHeight: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Page header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Rulebook</h1>
        {rulebookLink && (
          <a
            href={rulebookLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: '6px', fontSize: '14px', color: '#2563eb', textDecoration: 'none' }}
          >
            ↗ View external rulebook
          </a>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sticky ToC */}
        <nav aria-label="Table of contents" style={{
          width: '200px',
          flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          padding: '16px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Contents
          </div>
          {!loading && chapters.length === 0 && (
            <p style={{ fontSize: '12px', color: '#6b7280' }}>No chapters yet.</p>
          )}
          {chapters.map(ch => {
            const isActive = activeId === ch.id || (activeId === null && chapters[0]?.id === ch.id)
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
                  borderLeft: isActive ? '2px solid #2563eb' : '2px solid transparent',
                  color: isActive ? '#2563eb' : '#6b7280',
                  fontWeight: isActive ? 500 : 400,
                  fontSize: '13px',
                  marginBottom: '4px',
                  background: 'none',
                  border: 'none',
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
            {!loading && chapters.length === 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', color: '#6b7280' }}>
                No rulebook chapters have been added yet.
              </div>
            )}
            {chapters.map(ch => (
              <section
                key={ch.id}
                id={`chapter-${ch.id}`}
                style={{ scrollMarginTop: '24px', marginBottom: '24px' }}
              >
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    {ch.order + 1}. {ch.title}
                  </h2>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: ch.content }}
                    style={{ color: '#374151' }}
                  />
                  <div style={{ textAlign: 'right', marginTop: '16px' }}>
                    <a href="#top" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none' }}>
                      ↑ Back to top
                    </a>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
