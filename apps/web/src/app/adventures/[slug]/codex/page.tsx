'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AdventurePublicShell } from '../_components/AdventurePublicShell'
import type { GameCodex } from '@plotrunner/shared'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function CodexPage() {
  const params = useParams<{ slug: string }>()
  const [codex, setCodex] = useState<GameCodex | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const codexRes = await fetch(`${API_BASE}/games/${params.slug}/codex`)
        if (codexRes.status === 404) { setNotFound(true); return }
        const data = await codexRes.json() as GameCodex
        setCodex(data)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.slug])

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (notFound || !codex) return <div className="p-6">LARP not found.</div>

  const hasFactions = codex.factions && codex.factions.length > 0

  return (
    <AdventurePublicShell title="Codex" subtitle="World lore & setting">
      <div className="space-y-4">
        {(codex.genre || codex.tone) && (
          <Section title="Genre & Tone">
            <p className="text-sm">{[codex.genre, codex.tone].filter(Boolean).join(' · ')}</p>
          </Section>
        )}
        {codex.worldLore && (
          <Section title="World Lore">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.worldLore}</p>
          </Section>
        )}
        {hasFactions && (
          <Section title="Factions">
            <div className="flex flex-wrap gap-2">
              {codex.factions!.map(f => (
                <span key={f.name} className="px-2.5 py-1 rounded-full border text-xs font-medium">{f.name}</span>
              ))}
            </div>
          </Section>
        )}
        {(codex.safetyMechanics || codex.contentWarnings) && (
          <Section title="Safety & Content">
            {codex.safetyMechanics && <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{codex.safetyMechanics}</p>}
            {codex.contentWarnings && <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.contentWarnings}</p>}
          </Section>
        )}
        {codex.ageRestrictions && (
          <Section title="Age Restrictions">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.ageRestrictions}</p>
          </Section>
        )}
        {codex.codeOfConduct && (
          <Section title="Code of Conduct">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.codeOfConduct}</p>
          </Section>
        )}
        {codex.liabilityWaiver && (
          <Section title="Liability Waiver">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.liabilityWaiver}</p>
          </Section>
        )}
        {codex.organizerTeam && (
          <Section title="Organizer Team">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.organizerTeam}</p>
          </Section>
        )}
        {codex.contactEmail && (
          <Section title="Contact">
            <a href={`mailto:${codex.contactEmail}`} className="text-sm text-primary hover:underline">{codex.contactEmail}</a>
          </Section>
        )}
        {codex.npcCall && (
          <Section title="NPC Call">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.npcCall}</p>
          </Section>
        )}
        {codex.faq && (
          <Section title="FAQ">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.faq}</p>
          </Section>
        )}
        {(codex.mediaLinks || codex.sponsors) && (
          <Section title="Media & Sponsors">
            {codex.mediaLinks && <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{codex.mediaLinks}</p>}
            {codex.sponsors && <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.sponsors}</p>}
          </Section>
        )}
        {codex.testimonials && (
          <Section title="Testimonials">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.testimonials}</p>
          </Section>
        )}
        {codex.anythingElse && (
          <Section title="Additional Information">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{codex.anythingElse}</p>
          </Section>
        )}
      </div>
    </AdventurePublicShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-5">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}
