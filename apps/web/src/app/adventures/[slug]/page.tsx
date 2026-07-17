'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { SubscribeButton } from '@/components/SubscribeButton'
import { useAdventureContext, type AdventurePublicData } from '@/contexts/AdventureContext'
import { getContrastColor } from '@/lib/contrast'

const SOCIAL_MAP: { key: keyof AdventurePublicData; icon: string; label: string }[] = [
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

export default function AdventureLandingPage() {
  const params = useParams<{ slug: string }>()
  const { data: larp, theme } = useAdventureContext()
  const { colorPrimary, colorSecondary, colorBackground, headingFamily, bodyFamily } = theme
  const { user } = useAuth()

  const textColor = getContrastColor(colorBackground)

  const [isMember, setIsMember] = useState(false)
  const isLoggedIn = !!user

  useEffect(() => {
    if (!user) return
    async function checkMembership() {
      try {
        const memRes = await fetch(`${API_BASE}/games/${params.slug}/membership`, {
          credentials: 'include',
        })
        if (memRes.ok) {
          const { isMember: member } = await memRes.json() as { isMember: boolean }
          setIsMember(member)
        }
      } catch {
        // Non-fatal: membership check failing just means directory hidden for non-members
      }
    }
    void checkMembership()
  }, [params.slug, user])

  const initials = larp.siteTitle.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const socials = SOCIAL_MAP.filter(s => larp[s.key])
  const hasSocials = socials.length > 0 || (larp.additionalWebsites?.length ?? 0) > 0
  const showDir = larp.showDirectory || isMember

  return (
    <div className="min-h-screen" style={{ background: colorBackground, color: textColor, fontFamily: bodyFamily }}>
      {/* Banner */}
      {larp.bannerUrl ? (
        <div className="w-full h-48 overflow-hidden">
          <img src={larp.bannerUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="w-full h-48"
          style={{ background: `linear-gradient(to right, ${colorPrimary}66, ${colorSecondary}66)` }}
        />
      )}

      <div className="max-w-3xl mx-auto px-6">
        {/* Identity row */}
        <div className="flex items-center gap-4 py-5 border-b" style={{ borderColor: `${textColor}22` }}>
          <div
            className="w-14 h-14 rounded-full border-2 overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold"
            style={{ borderColor: `${textColor}44`, background: `${colorPrimary}33`, color: textColor }}
          >
            {larp.logoUrl ? (
              <img src={larp.logoUrl} alt={larp.siteTitle} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-bold leading-tight truncate"
              style={{ fontFamily: headingFamily, color: textColor }}
            >
              {larp.siteTitle}
            </h1>
            {larp.tagline && (
              <p className="text-sm mt-0.5" style={{ color: textColor, opacity: 0.7 }}>
                {larp.tagline}
              </p>
            )}
          </div>
          {isLoggedIn && (
            <SubscribeButton gameId={larp.id} initialSubscribed={isMember} onToggle={setIsMember} />
          )}
        </div>

        {/* Welcome */}
        {larp.welcomeMessage && (
          <div className="py-6 border-b" style={{ borderColor: `${textColor}22` }}>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: textColor, opacity: 0.6 }}
            >
              Welcome
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: textColor }}>
              {larp.welcomeMessage}
            </p>
          </div>
        )}

        {/* About & Connect */}
        {hasSocials && (
          <div className="py-6 border-b" style={{ borderColor: `${textColor}22` }}>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: textColor, opacity: 0.6 }}
            >
              About &amp; Connect
            </h2>
            <div className="flex flex-wrap gap-2">
              {socials.map(s => (
                <a
                  key={s.key}
                  href={larp[s.key] as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ border: `1px solid ${textColor}33`, color: textColor }}
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
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ border: `1px solid ${textColor}33`, color: textColor }}
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
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: textColor, opacity: 0.6 }}
          >
            Directory
          </h2>
          {showDir ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {DIRECTORY_CARDS.map(card => (
                <Link
                  key={card.slug}
                  href={`/adventures/${larp.slug}/${card.slug}`}
                  className="flex flex-col items-center text-center p-4 rounded-xl transition-colors"
                  style={{ border: `1px solid ${textColor}22`, color: textColor }}
                >
                  <span className="text-2xl mb-2">{card.icon}</span>
                  <span className="text-xs font-semibold">{card.title}</span>
                  <span className="text-xs mt-0.5" style={{ opacity: 0.6 }}>{card.subtitle}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl p-6 text-center"
              style={{ border: `1px solid ${textColor}22` }}
            >
              <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
                Become a member to view the directory.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
