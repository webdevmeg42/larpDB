'use client'

import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function SpellsFieldPreview({ field }: PreviewProps) {
  const entries = [...(field.spellEntries ?? [])].sort((a, b) => a.level - b.level)
  return (
    <div className="space-y-2">
      <Label className="text-sm">{field.label || 'Spells'}</Label>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No spells defined yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i} className="rounded border px-3 py-2 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${e.kind === 'new' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                  {e.kind === 'new' ? 'NEW' : 'UPGRADE'}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">Lv {e.level}</span>
                <span className="flex-1 font-medium">
                  {e.kind === 'new' ? e.name || '(unnamed)' : e.spellName || '(spell)'}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{e.hitPoints} HP</span>
              </div>
              {e.effects && (
                <p className="text-xs text-muted-foreground pl-1">{e.effects}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
