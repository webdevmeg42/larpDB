'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function StatblockFieldPreview({ field, value, onChange }: PreviewProps) {
  const statVals = (value as Record<string, number | ''>) ?? {}
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {field.label || '(Stat Block)'}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {(field.stats ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No stats added yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {(field.stats ?? []).map(stat => (
            <div key={stat.key} className="space-y-1 text-center">
              <Label className="text-xs block">{stat.label || stat.key}</Label>
              <Input
                type="number"
                value={statVals[stat.key] ?? ''}
                onChange={e => {
                  const n = e.target.value ? Number(e.target.value) : ''
                  onChange({ ...statVals, [stat.key]: n })
                }}
                placeholder={[stat.min, stat.max].filter((v): v is number => v !== undefined).join('–') || '0'}
                min={stat.min}
                max={stat.max}
                className="h-10 text-center text-base font-bold"
              />
              {stat.xpCostPerPoint !== undefined && (
                <p className="text-xs text-muted-foreground">{stat.xpCostPerPoint} XP/pt</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
