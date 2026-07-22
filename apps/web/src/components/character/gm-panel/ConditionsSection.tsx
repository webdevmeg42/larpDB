'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { GmData, GmCondition } from '@plotrunner/shared'
import { useSave, Section } from './_shared'

const CONDITION_TYPES: { type: GmCondition['type']; label: string; hasFlavorText?: boolean }[] = [
  { type: 'poisoned', label: 'Poisoned' },
  { type: 'cursed', label: 'Cursed', hasFlavorText: true },
  { type: 'diseased', label: 'Diseased' },
  { type: 'blinded', label: 'Blinded' },
  { type: 'deafened', label: 'Deafened' },
  { type: 'paralyzed', label: 'Paralyzed' },
  { type: 'stunned', label: 'Stunned' },
  { type: 'charmed', label: 'Charmed / Compelled', hasFlavorText: true },
  { type: 'frightened', label: 'Frightened' },
]

export function ConditionsSection({ gm, onSave }: { gm: GmData; onSave: (u: Partial<GmData>) => Promise<void> }) {
  const [conditions, setConditions] = useState<GmCondition[]>(gm.conditions ?? [])
  const [exhaustionLevel, setExhaustionLevel] = useState(gm.exhaustionLevel ?? 0)
  const [customCondition, setCustomCondition] = useState(gm.customCondition ?? '')
  const [customConditionDuration, setCustomConditionDuration] = useState(gm.customConditionDuration ?? '')
  const { save, label, saving } = useSave()

  useEffect(() => {
    setConditions(gm.conditions ?? [])
    setExhaustionLevel(gm.exhaustionLevel ?? 0)
    setCustomCondition(gm.customCondition ?? '')
    setCustomConditionDuration(gm.customConditionDuration ?? '')
  }, [gm])

  function isActive(type: GmCondition['type']) {
    return conditions.some(c => c.type === type)
  }

  function toggleCondition(type: GmCondition['type']) {
    setConditions(prev =>
      prev.some(c => c.type === type)
        ? prev.filter(c => c.type !== type)
        : [...prev, { type }],
    )
  }

  function updateCondition(type: GmCondition['type'], patch: Partial<GmCondition>) {
    setConditions(prev => prev.map(c => c.type === type ? { ...c, ...patch } : c))
  }

  return (
    <Section title="Ailments &amp; Conditions">
      <div className="space-y-3">
        {CONDITION_TYPES.map(({ type, label: condLabel, hasFlavorText }) => {
          const active = isActive(type)
          const cond = conditions.find(c => c.type === type)
          return (
            <div key={type} className={`rounded border p-3 space-y-2 ${active ? 'border-destructive/40 bg-destructive/5' : 'border-border'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleCondition(type)}
                  className="h-4 w-4 accent-destructive"
                />
                <span className="text-sm font-medium">{condLabel}</span>
              </label>
              {active && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <Input
                    value={cond?.duration ?? ''}
                    onChange={e => updateCondition(type, { duration: e.target.value })}
                    placeholder="Duration (e.g. 2 events)"
                    className="text-xs h-8"
                  />
                  {hasFlavorText && (
                    <Input
                      value={cond?.flavorText ?? ''}
                      onChange={e => updateCondition(type, { flavorText: e.target.value })}
                      placeholder="Flavor text"
                      className="text-xs h-8"
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div className="rounded border p-3 space-y-2">
          <Label className="text-sm font-medium">Exhaustion level (0–6)</Label>
          <div className="flex gap-2 items-center">
            {[0, 1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setExhaustionLevel(n)}
                className={`w-8 h-8 rounded text-sm font-mono border transition-colors ${
                  exhaustionLevel === n
                    ? 'bg-destructive text-destructive-foreground border-destructive'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded border p-3 space-y-2">
          <Label className="text-sm font-medium">Custom condition</Label>
          <Textarea
            value={customCondition}
            onChange={e => setCustomCondition(e.target.value)}
            placeholder="Describe any system-specific or story-specific effect…"
            rows={2}
          />
          <Input
            value={customConditionDuration}
            onChange={e => setCustomConditionDuration(e.target.value)}
            placeholder="Duration (e.g. until next event)"
            className="text-xs h-8"
          />
        </div>
      </div>

      <Button
        size="sm"
        disabled={saving}
        onClick={() => void save(() => {
          const patch: Partial<GmData> = { conditions, exhaustionLevel }
          if (customCondition) patch.customCondition = customCondition
          if (customConditionDuration) patch.customConditionDuration = customConditionDuration
          return onSave(patch)
        })}
      >
        {label}
      </Button>
    </Section>
  )
}
