'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParticleCanvas } from './ParticleCanvas'
import { FeatureCarousel } from './FeatureCarousel'

export function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTryFree() {
    setLoading(true)
    setError(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) throw new Error('API URL not configured')
      const res = await fetch(`${apiUrl}/auth/guest`, { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to create guest session')
      const { gameId } = await res.json() as { gameId: string }
      router.push(`/adventures/${gameId}/edit`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <ParticleCanvas />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', background: '#0b1020', color: '#c4d4e6', fontFamily: 'system-ui, sans-serif' }}>
        {/* Nav */}
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', borderBottom: '1px solid #c9a84c22' }}>
          <span style={{ fontFamily: '"Cinzel Decorative", serif', color: '#c9a84c', fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>
            PlotRunner
          </span>
          <a
            href="/login"
            style={{ border: '1px solid #c9a84c55', color: '#c9a84c', borderRadius: 6, padding: '6px 18px', textDecoration: 'none', fontSize: 14 }}
          >
            Log in
          </a>
        </nav>

        {/* Split hero */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          maxWidth: 1100,
          margin: '0 auto',
          padding: '80px 40px',
          alignItems: 'center',
        }}
          className="landing-grid"
        >
          {/* Left: pitch */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h1 style={{ fontFamily: '"Cinzel Decorative", serif', color: '#c9a84c', fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.2, margin: 0 }}>
              Run your LARP,<br />not your spreadsheets.
            </h1>
            <p style={{ color: '#8ab0d4', fontSize: 17, lineHeight: 1.6, margin: 0 }}>
              Character sheets, XP, events, and a store — all in one place.
            </p>

            {error && (
              <p style={{ color: '#e06c6c', fontSize: 14, margin: 0 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleTryFree}
                disabled={loading}
                style={{
                  background: '#c9a84c',
                  color: '#0b1020',
                  border: 'none',
                  borderRadius: 6,
                  padding: '12px 28px',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? 'Loading…' : 'Try it free →'}
              </button>
              <a
                href="/login"
                style={{
                  border: '1px solid #c9a84c55',
                  color: '#c9a84c',
                  borderRadius: 6,
                  padding: '12px 28px',
                  fontSize: 16,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Log in
              </a>
            </div>

            <p style={{ color: '#8ab0d455', fontSize: 13, margin: 0 }}>
              No account required · Guest data resets after 24 hours
            </p>
          </div>

          {/* Right: feature carousel */}
          <div>
            <FeatureCarousel />
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&display=swap');
        @media (max-width: 700px) {
          .landing-grid {
            grid-template-columns: 1fr !important;
            padding: 40px 20px !important;
          }
        }
      `}</style>
    </>
  )
}
