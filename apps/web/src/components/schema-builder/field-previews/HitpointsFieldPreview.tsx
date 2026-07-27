'use client'

import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function HitpointsFieldPreview({ field }: PreviewProps) {
  const entries = [...(field.hitPointEntries ?? [])].sort((a, b) => a.level - b.level)
  return (
    <div className="space-y-2">
      <Label className="text-sm">{field.label || 'Hit Points'}</Label>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No hit point levels defined yet</p>
      ) : (
        <table className="w-full text-sm border rounded overflow-hidden">
          <thead>
            <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-3 py-1.5 text-left font-medium">Level</th>
              <th className="px-3 py-1.5 text-left font-medium">HP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-1.5 font-mono">{e.level}</td>
                <td className="px-3 py-1.5 font-mono">{e.hp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
