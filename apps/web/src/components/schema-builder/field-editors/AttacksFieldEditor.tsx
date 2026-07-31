'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import type { SchemaField, AttackEntry, CharacterSchemaType, CodexLevelConfig } from '@plotrunner/shared'
import { computeCodexLevel } from '@plotrunner/shared'
import { Trash2, Plus } from 'lucide-react'
import { LevelSelect, getLevelingSystemLabel } from './_shared'

interface Props {
  field: SchemaField
  onChange: (field: SchemaField) => void
  schemaType?: CharacterSchemaType
  highlightUnlabeled?: boolean
}

export function AttacksFieldEditor({ field, onChange }: Props) {
  const { config } = useSiteConfig()
  const maxLevel = config?.codex?.maxLevel ?? 20
  const codex = config?.codex as (CodexLevelConfig & { maxLevel?: number }) | undefined

  const [showLevelModal, setShowLevelModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [exceedingLevel, setExceedingLevel] = useState(0)
  const [useProgression, setUseProgression] = useState(false)
  useEffect(() => { setUseProgression(false) }, [field.id])

  function update(patch: Partial<SchemaField>) {
    onChange({ ...field, ...patch } as SchemaField)
  }

  function checkLevel(level: number, action: () => void) {
    if (level > maxLevel) {
      setExceedingLevel(level)
      setPendingAction(() => action)
      setShowLevelModal(true)
    } else {
      action()
    }
  }

  function applyProgression() {
    if (!codex?.levelingSystem) return
    const cfg: CodexLevelConfig = {
      levelingSystem: codex.levelingSystem,
      ...(codex.linearIncrement !== undefined ? { linearIncrement: codex.linearIncrement } : {}),
      ...(codex.flatCost !== undefined ? { flatCost: codex.flatCost } : {}),
    }
    const entries = field.attackEntries ?? []
    const sorted = [...entries].sort((a, b) => a.level - b.level)
    const base = sorted[0]?.hitPoints ?? 5
    update({ attackEntries: entries.map(e => ({ ...e, hitPoints: computeCodexLevel(base, e.level, cfg) })) })
  }

  function renderProgressionToggle(hasEntries: boolean) {
    const sys = codex?.levelingSystem
    const isDisabled = !sys || !hasEntries

    function handleToggle(checked: boolean) {
      setUseProgression(checked)
      if (checked && sys && hasEntries) applyProgression()
    }

    return (
      <div className="rounded border border-dashed p-2 space-y-1 mt-2">
        <label className={`flex items-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={useProgression}
            onChange={e => handleToggle(e.target.checked)}
            disabled={isDisabled}
            className="h-3.5 w-3.5"
          />
          <span className="text-xs font-medium">Apply leveling progression stats</span>
        </label>
        <p className="text-xs text-muted-foreground pl-5">
          {sys ? getLevelingSystemLabel(sys) : 'No leveling system configured in The Codex'}
        </p>
        {useProgression && (
          <p className="text-xs text-muted-foreground pl-5 italic">
            Values auto-filled. Uncheck to edit manually.
          </p>
        )}
      </div>
    )
  }

  const entries: AttackEntry[] = field.attackEntries ?? []

  const definedAttackNames = entries
    .filter(e => e.kind === 'new' && e.name.trim() !== '')
    .map(e => e.name)

  function addAttack() {
    const newEntries: AttackEntry[] = [
      { kind: 'new', level: 1, name: '', hitPoints: 5 },
      { kind: 'new', level: 2, name: '', hitPoints: 5 },
      { kind: 'new', level: 3, name: '', hitPoints: 5 },
    ]
    checkLevel(3, () => {
      update({ attackEntries: [...entries, ...newEntries] })
    })
  }

  function addUpgrade() {
    checkLevel(1, () => {
      update({ attackEntries: [...entries, { kind: 'upgrade', level: 1, name: '', attackName: '', hitPoints: 5 }] })
    })
  }

  function updateEntry(idx: number, patch: Partial<AttackEntry>) {
    const updated = entries.map((e, i) => i === idx ? { ...e, ...patch } : e) as AttackEntry[]
    if (patch.level !== undefined) {
      checkLevel(patch.level, () => update({ attackEntries: updated }))
    } else {
      update({ attackEntries: updated })
    }
  }

  function remove(idx: number) {
    update({ attackEntries: entries.filter((_, i) => i !== idx) })
  }

  function getHpError(idx: number, entry: AttackEntry): string | null {
    if (entry.kind !== 'upgrade' || !entry.attackName) return null
    const prevHPs = entries
      .filter((e, i) => i !== idx && (e.name === entry.attackName || e.attackName === entry.attackName) && e.level < entry.level)
      .map(e => e.hitPoints)
    if (prevHPs.length === 0) return null
    const maxPrev = Math.max(...prevHPs)
    return entry.hitPoints <= maxPrev ? `Must exceed previous version (${maxPrev} HP)` : null
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide">Attacks</p>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No attacks added yet</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const hpError = getHpError(i, entry)
              return (
                <div key={i} className="rounded border p-2 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-medium ${entry.kind === 'new' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                      {entry.kind === 'new' ? 'NEW' : 'UPGRADE'}
                    </span>
                    <span className="text-xs text-muted-foreground">Lv</span>
                    <LevelSelect value={entry.level} max={maxLevel} onChange={n => updateEntry(i, { level: n })} />
                    <button onClick={() => remove(i)} aria-label="Remove attack" className="ml-auto text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {entry.kind === 'new' ? (
                    <Input
                      value={entry.name}
                      onChange={e => updateEntry(i, { name: e.target.value })}
                      placeholder="Attack name"
                      className="h-7 text-xs"
                    />
                  ) : (
                    <select
                      value={entry.attackName ?? ''}
                      onChange={e => updateEntry(i, { attackName: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="">Select attack to upgrade…</option>
                      {definedAttackNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground shrink-0">HP</span>
                    {useProgression ? (
                      <span className="text-xs font-mono w-20 py-1">{entry.hitPoints}</span>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        value={entry.hitPoints}
                        onChange={e => updateEntry(i, { hitPoints: parseInt(e.target.value) || 1 })}
                        className="h-7 text-xs w-20"
                      />
                    )}
                    {hpError && <p className="text-xs text-destructive">{hpError}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {renderProgressionToggle(entries.length > 0)}
        <div className="flex gap-2 pt-1 border-t">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={addAttack}>
            <Plus className="h-3 w-3 mr-1" /> Add Attack
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={addUpgrade}>
            <Plus className="h-3 w-3 mr-1" /> Add Upgrade
          </Button>
        </div>
      </div>

      <Dialog open={showLevelModal} onClose={() => { setShowLevelModal(false); setPendingAction(null) }}>
        <DialogTitle>Level exceeds max level</DialogTitle>
        <DialogDescription>
          Level {exceedingLevel} is above your configured max level of {maxLevel} in The Codex.
          Players won&apos;t normally reach this level. You can still define progression for it,
          but consider updating your max level setting first.
        </DialogDescription>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => { setShowLevelModal(false); setPendingAction(null) }}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => { pendingAction?.(); setShowLevelModal(false); setPendingAction(null) }}>
            Add anyway
          </Button>
        </div>
      </Dialog>
    </>
  )
}
