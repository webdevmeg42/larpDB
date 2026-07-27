'use client'

import Link from 'next/link'
import type { SiteConfig, Game } from '@plotrunner/shared'

interface Props {
  config: SiteConfig | null
  game: Game | null
  onTabChange: (tab: string) => void
}

interface ChecklistItem {
  label: string
  done: boolean
  action: () => void
  actionLabel: string
  href?: string
}

export default function SetupChecklist({ config, game, onTabChange }: Props) {
  const hasTagline = Boolean(config?.tagline?.trim())
  const hasCodexEntry = config?.codex
    ? Object.entries(config.codex).some(([k, v]) => k !== 'rulebook' && Boolean(v) && !(Array.isArray(v) && v.length === 0))
    : false
  const hasChapter = (config?.codex?.rulebook?.chapters?.length ?? 0) > 0
  const isEnabled = game?.status === 'active'

  if (!config || !game) return null

  const items: ChecklistItem[] = [
    { label: 'Set a tagline', done: hasTagline, action: () => onTabChange('branding'), actionLabel: '→ Branding' },
    { label: 'Configure Codex', done: hasCodexEntry, action: () => onTabChange('codex'), actionLabel: '→ Codex' },
    { label: 'Add a rulebook chapter', done: hasChapter, action: () => onTabChange('rulebook'), actionLabel: '→ Rulebook' },
    { label: 'Enable the adventure', done: isEnabled, action: () => {}, actionLabel: '→ Adventures', href: '/adventures' },
  ]

  const doneCount = items.filter(i => i.done).length

  if (doneCount === items.length) return null

  const pct = Math.round((doneCount / items.length) * 100)

  return (
    <div
      data-testid="setup-checklist"
      className="mb-6 border rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold text-foreground">Setup</span>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{doneCount} of {items.length}</span>
      </div>

      <div className="h-4 w-px bg-border shrink-0" />

      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5 shrink-0">
          <span className={`text-sm leading-none ${item.done ? 'text-green-600' : 'text-muted-foreground'}`}>
            {item.done ? '✅' : '☐'}
          </span>
          <span className={`text-xs ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {item.label}
          </span>
          {!item.done && (
            item.href ? (
              <Link href={item.href} className="text-xs text-primary hover:underline">
                {item.actionLabel}
              </Link>
            ) : (
              <button
                onClick={item.action}
                className="text-xs text-primary hover:underline"
              >
                {item.actionLabel}
              </button>
            )
          )}
        </div>
      ))}
    </div>
  )
}
