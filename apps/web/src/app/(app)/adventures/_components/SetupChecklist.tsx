'use client'

import { useRouter } from 'next/navigation'
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
}

export default function SetupChecklist({ config, game, onTabChange }: Props) {
  const router = useRouter()
  const hasTagline = Boolean(config?.tagline?.trim())
  const hasCodexEntry = config?.codex
    ? Object.entries(config.codex).some(([k, v]) => k !== 'rulebook' && Boolean(v) && !(Array.isArray(v) && v.length === 0))
    : false
  const hasChapter = (config?.codex?.rulebook?.chapters?.length ?? 0) > 0
  const isEnabled = game?.status === 'active'

  const items: ChecklistItem[] = [
    { label: 'Set a tagline', done: hasTagline, action: () => onTabChange('branding'), actionLabel: '→ Branding' },
    { label: 'Configure Codex', done: hasCodexEntry, action: () => onTabChange('codex'), actionLabel: '→ Codex' },
    { label: 'Add a rulebook chapter', done: hasChapter, action: () => onTabChange('rulebook'), actionLabel: '→ Rulebook' },
    { label: 'Enable the adventure', done: isEnabled, action: () => router.push('/adventures'), actionLabel: '→ Adventures' },
  ]

  const doneCount = items.filter(i => i.done).length

  if (doneCount === items.length) return null

  const pct = Math.round((doneCount / items.length) * 100)

  return (
    <div
      data-testid="setup-checklist"
      className="w-48 shrink-0 border rounded-lg p-4 flex flex-col gap-3 self-start"
    >
      <div className="text-xs font-semibold text-foreground">Setup</div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">{doneCount} of {items.length} complete</div>
      <div className="flex flex-col gap-2">
        {items.map(item => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 text-sm leading-none ${item.done ? 'text-green-600' : 'text-muted-foreground'}`}>
                {item.done ? '✅' : '☐'}
              </span>
              <span className={`text-xs leading-snug ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {item.label}
              </span>
            </div>
            {!item.done && (
              <button
                onClick={item.action}
                className="ml-5 text-xs text-primary hover:underline text-left"
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
