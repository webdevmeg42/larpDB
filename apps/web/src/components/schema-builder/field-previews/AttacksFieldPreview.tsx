'use client'

import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function AttacksFieldPreview({ field }: PreviewProps) {
  const entries = [...(field.attackEntries ?? [])].sort((a, b) => a.level - b.level)
  return (
    <div className="space-y-2">
      <Label className="text-sm">{field.label || 'Attacks'}</Label>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No attacks defined yet</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e, i) => (
            <div key={i} className="rounded border px-3 py-2 flex items-center gap-2 text-sm">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${e.kind === 'new' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                {e.kind === 'new' ? 'NEW' : 'UPGRADE'}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">Lv {e.level}</span>
              <span className="flex-1 font-medium">
                {e.kind === 'new' ? e.name || '(unnamed)' : e.attackName || '(attack)'}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{e.hitPoints} HP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
