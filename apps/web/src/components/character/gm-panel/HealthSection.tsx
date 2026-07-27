'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GmData } from '@plotrunner/shared'
import { useSave, Section, Field } from './_shared'

export function HealthSection({ gm, onSave }: { gm: GmData; onSave: (u: Partial<GmData>) => Promise<void> }) {
  const [currentHp, setCurrentHp] = useState(gm.currentHp?.toString() ?? '')
  const [maxHpOverride, setMaxHpOverride] = useState(gm.maxHpOverride?.toString() ?? '')
  const [deathCount, setDeathCount] = useState(gm.deathCount?.toString() ?? '0')
  const [statusFlag, setStatusFlag] = useState<GmData['statusFlag']>(gm.statusFlag ?? 'alive')
  const { save, label, saving } = useSave()

  useEffect(() => {
    setCurrentHp(gm.currentHp?.toString() ?? '')
    setMaxHpOverride(gm.maxHpOverride?.toString() ?? '')
    setDeathCount(gm.deathCount?.toString() ?? '0')
    setStatusFlag(gm.statusFlag ?? 'alive')
  }, [gm])

  return (
    <Section title="Health &amp; Status">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Current HP">
          <Input type="number" value={currentHp} onChange={e => setCurrentHp(e.target.value)} placeholder="—" />
        </Field>
        <Field label="Max HP override">
          <Input type="number" min={0} value={maxHpOverride} onChange={e => setMaxHpOverride(e.target.value)} placeholder="Leave blank for default" />
        </Field>
        <Field label="Death count">
          <Input type="number" min={0} value={deathCount} onChange={e => setDeathCount(e.target.value)} />
        </Field>
        <Field label="Status">
          <select
            value={statusFlag}
            onChange={e => setStatusFlag(e.target.value as GmData['statusFlag'])}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="alive">Alive</option>
            <option value="unconscious">Unconscious</option>
            <option value="stable">Stable</option>
            <option value="dead">Dead</option>
          </select>
        </Field>
      </div>
      <Button
        size="sm"
        disabled={saving}
        onClick={() => void save(() => {
          const patch: Partial<GmData> = { deathCount: parseInt(deathCount, 10) || 0 }
          if (statusFlag) patch.statusFlag = statusFlag
          if (currentHp !== '') patch.currentHp = parseInt(currentHp, 10)
          if (maxHpOverride !== '') patch.maxHpOverride = parseInt(maxHpOverride, 10)
          return onSave(patch)
        })}
      >
        {label}
      </Button>
    </Section>
  )
}
