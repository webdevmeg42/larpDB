'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import type { SchemaField, StatBlockStat, StatLevelEntry, CharacterSchemaType, CodexLevelConfig } from '@plotrunner/shared'
import { computeCodexLevel } from '@plotrunner/shared'
import { Trash2, Plus } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { LevelSelect, getLevelingSystemLabel } from './_shared'

interface Props {
  field: SchemaField
  onChange: (field: SchemaField) => void
  schemaType?: CharacterSchemaType
  highlightUnlabeled?: boolean
}

export function StatblockFieldEditor({ field, onChange }: Props) {
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
    const stats = field.stats ?? []
    update({ stats: stats.map(stat => {
      const sorted = [...(stat.levelEntries ?? [])].sort((a, b) => a.level - b.level)
      const base = sorted[0]?.value
      if (base == null) return stat
      return { ...stat, levelEntries: Array.from({ length: maxLevel }, (_, i) => ({ level: i + 1, value: computeCodexLevel(base, i + 1, cfg) })) }
    }) })
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

  const stats: StatBlockStat[] = field.stats ?? []

  function addStat() {
    update({ stats: [...stats, { key: uuidv4(), label: '', levelEntries: [] }] })
  }

  function updateStat(index: number, patch: Partial<StatBlockStat>) {
    update({ stats: stats.map((s, i) => i === index ? { ...s, ...patch } : s) })
  }

  function removeStat(index: number) {
    update({ stats: stats.filter((_, i) => i !== index) })
  }

  function addStatLevel(statIdx: number) {
    const entries = stats[statIdx].levelEntries ?? []
    const nextLevel = entries.length > 0 ? Math.max(...entries.map(e => e.level)) + 1 : 1
    checkLevel(nextLevel, () => {
      updateStat(statIdx, { levelEntries: [...entries, { level: nextLevel, value: 0 }] })
    })
  }

  function updateStatLevel(statIdx: number, levelIdx: number, patch: Partial<StatLevelEntry>) {
    const entries = stats[statIdx].levelEntries ?? []
    const updated = entries.map((e, i) => i === levelIdx ? { ...e, ...patch } : e)
    if (patch.level !== undefined) {
      checkLevel(patch.level, () => updateStat(statIdx, { levelEntries: updated }))
    } else {
      updateStat(statIdx, { levelEntries: updated })
    }
  }

  function removeStatLevel(statIdx: number, levelIdx: number) {
    const entries = stats[statIdx].levelEntries ?? []
    updateStat(statIdx, { levelEntries: entries.filter((_, i) => i !== levelIdx) })
  }

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Stats</Label>
        {stats.map((stat, i) => {
          const entries = stat.levelEntries ?? []
          return (
            <div key={stat.key} className="rounded border p-2 space-y-2">
              <div className="flex gap-1 items-center">
                <Input
                  value={stat.label}
                  onChange={e => updateStat(i, { label: e.target.value })}
                  placeholder="Stat name (e.g. STR)"
                  className="h-8 text-xs flex-1"
                />
                <button onClick={() => removeStat(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Input
                  type="number"
                  value={stat.min ?? ''}
                  onChange={e => updateStat(i, { min: e.target.value ? Number(e.target.value) : undefined } as Partial<StatBlockStat>)}
                  placeholder="Min"
                  className="h-7 text-xs"
                />
                <Input
                  type="number"
                  value={stat.max ?? ''}
                  onChange={e => updateStat(i, { max: e.target.value ? Number(e.target.value) : undefined } as Partial<StatBlockStat>)}
                  placeholder="Max"
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Level progression</p>
                {useProgression ? (
                  entries.slice().sort((a, b) => a.level - b.level).map((e, ei) => (
                    <div key={ei} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="shrink-0 w-12">Lv {e.level}</span>
                      <span className="shrink-0">→</span>
                      <span className="font-mono">{e.value}</span>
                    </div>
                  ))
                ) : (
                  <>
                    {entries.map((e, ei) => (
                      <div key={ei} className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground shrink-0">Lv</span>
                        <LevelSelect value={e.level} max={maxLevel} onChange={n => updateStatLevel(i, ei, { level: n })} />
                        <span className="text-xs text-muted-foreground shrink-0">→</span>
                        <Input
                          type="number"
                          value={e.value}
                          onChange={ev => updateStatLevel(i, ei, { value: Number(ev.target.value) || 0 })}
                          className="h-7 text-xs w-16"
                        />
                        <button onClick={() => removeStatLevel(i, ei)} className="text-muted-foreground hover:text-destructive shrink-0">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addStatLevel(i)} className="w-full h-6 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Add level
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {!useProgression && (
          <Button variant="ghost" size="sm" onClick={addStat} className="w-full h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add stat
          </Button>
        )}
        {renderProgressionToggle(stats.some(s => (s.levelEntries ?? []).length > 0))}
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
