'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getToken } from '@/lib/auth'

interface LarpPublic {
  id: string
  name: string
  slug: string
  joinMode: 'open' | 'approval'
  status: 'active' | 'inactive'
  siteTitle: string
  tagline: string | null
  logoUrl: string | null
  bannerUrl: string | null
  welcomeMessage: string | null
  showDirectory: boolean
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

const SOCIAL_MAP: { key: keyof LarpPublic; icon: string; label: string }[] = [
  { key: 'socialFacebook', icon: '📘', label: 'Facebook' },
  { key: 'socialInstagram', icon: '📸', label: 'Instagram' },
  { key: 'socialSnapchat', icon: '👻', label: 'Snapchat' },
  { key: 'socialTikTok', icon: '🎵', label: 'TikTok' },
  { key: 'socialBluesky', icon: '🦋', label: 'Bluesky' },
  { key: 'socialSubstack', icon: '📰', label: 'Substack' },
  { key: 'socialTwitter', icon: '🐦', label: 'Twitter / X' },
  { key: 'socialDiscord', icon: '💬', label: 'Discord' },
]

const DIRECTORY_CARDS = [
  { icon: '📖', title: 'Codex', subtitle: 'World lore & setting', slug: 'codex' },
  { icon: '📜', title: 'Rulebook', subtitle: 'Game mechanics', slug: 'rulebook' },
  { icon: '🛒', title: 'Store', subtitle: 'Tickets & items', slug: 'store' },
  { icon: '⚔️', title: 'Race Builds', subtitle: 'Playable races', slug: 'race-builds' },
  { icon: '🎭', title: 'Class Builds', subtitle: 'Character classes', slug: 'class-builds' },
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function LarpLandingPage() {
  const params = useParams<{ slug: string }>()
  const [larp, setLarp] = useState<LarpPublic | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/games/${params.slug}/public`)
        if (res.status === 404) { setNotFound(true); return }
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json() as LarpPublic
        setLarp(data)

        const token = getToken()
        if (token) {
          try {
            const memRes = await fetch(`${API_BASE}/games/${params.slug}/membership`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (memRes.ok) {
              const { isMember: member } = await memRes.json() as { isMember: boolean }
              setIsMember(member)
            }
          } catch {
            // Non-fatal: membership check failing just means directory hidden for non-members
          }
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.slug])

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (notFound || !larp) return <div className="p-6">LARP not found.</div>

  const initials = larp.siteTitle.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const socials = SOCIAL_MAP.filter(s => larp[s.key])
  const hasSocials = socials.length > 0 || (larp.additionalWebsites?.length ?? 0) > 0
  const showDir = larp.showDirectory || isMember

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      {larp.bannerUrl ? (
        <div className="w-full h-48 overflow-hidden">
          <img src={larp.bannerUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-r from-primary/40 to-secondary/40" />
      )}

      <div className="max-w-3xl mx-auto px-6">
        {/* Identity row */}
        <div className="flex items-center gap-4 py-5 border-b">
          <div className="w-14 h-14 rounded-full border-2 border-border overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center text-sm font-bold">
            {larp.logoUrl ? (
              <img src={larp.logoUrl} alt={larp.siteTitle} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight truncate">{larp.siteTitle}</h1>
            {larp.tagline && <p className="text-muted-foreground text-sm mt-0.5">{larp.tagline}</p>}
          </div>
          {larp.joinMode === 'open' && !isMember && (
            <Link
              href={`/join/${larp.id}`}
              className="flex-shrink-0 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors"
            >
              Join LARP
            </Link>
          )}
        </div>

        {/* Welcome */}
        {larp.welcomeMessage && (
          <div className="py-6 border-b">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Welcome</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{larp.welcomeMessage}</p>
          </div>
        )}

        {/* About & Connect */}
        {hasSocials && (
          <div className="py-6 border-b">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">About & Connect</h2>
            <div className="flex flex-wrap gap-2">
              {socials.map(s => (
                <a
                  key={s.key}
                  href={larp[s.key] as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </a>
              ))}
              {larp.additionalWebsites?.map(site => (
                <a
                  key={site.url}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
                >
                  <span>🌐</span>
                  <span>{site.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Directory */}
        <div className="py-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Directory</h2>
          {showDir ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {DIRECTORY_CARDS.map(card => (
                <Link
                  key={card.slug}
                  href={`/larps/${larp.slug}/${card.slug}`}
                  className="flex flex-col items-center text-center p-4 rounded-xl border hover:bg-muted transition-colors"
                >
                  <span className="text-2xl mb-2">{card.icon}</span>
                  <span className="text-xs font-semibold">{card.title}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border p-6 text-center">
              <p className="text-muted-foreground text-sm mb-3">Become a member to view the directory.</p>
              {larp.joinMode === 'open' ? (
                <Link
                  href={`/join/${larp.id}`}
                  className="inline-block px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Join LARP
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">Membership by approval.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
