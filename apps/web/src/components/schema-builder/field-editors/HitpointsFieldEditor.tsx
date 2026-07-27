'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import type { SchemaField, HitPointEntry, CharacterSchemaType, CodexLevelConfig } from '@plotrunner/shared'
import { computeCodexLevel } from '@plotrunner/shared'
import { Trash2, Plus } from 'lucide-react'
import { LevelSelect, getLevelingSystemLabel } from './_shared'

interface Props {
  field: SchemaField
  onChange: (field: SchemaField) => void
  schemaType?: CharacterSchemaType
  highlightUnlabeled?: boolean
}

export function HitpointsFieldEditor({ field, onChange }: Props) {
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
    const sorted = [...(field.hitPointEntries ?? [])].sort((a, b) => a.level - b.level)
    const base = sorted[0]?.hp ?? 5
    update({ hitPointEntries: Array.from({ length: maxLevel }, (_, i) => ({ level: i + 1, hp: computeCodexLevel(base, i + 1, cfg) })) })
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

  const entries: HitPointEntry[] = field.hitPointEntries ?? []

  function handleAdd() {
    const nextLevel = entries.length > 0 ? Math.max(...entries.map(e => e.level)) + 1 : 1
    checkLevel(nextLevel, () => {
      update({ hitPointEntries: [...entries, { level: nextLevel, hp: 5 }] })
    })
  }

  function handleLevelChange(idx: number, level: number) {
    checkLevel(level, () => {
      update({ hitPointEntries: entries.map((e, i) => i === idx ? { ...e, level } : e) })
    })
  }

  function handleHpChange(idx: number, hp: number) {
    update({ hitPointEntries: entries.map((e, i) => i === idx ? { ...e, hp } : e) })
  }

  function remove(idx: number) {
    update({ hitPointEntries: entries.filter((_, i) => i !== idx) })
  }

  return (
    <>
      <div className="space-y-2">
        {useProgression ? (
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground border-b pb-1">
              <span>Level</span>
              <span>HP</span>
            </div>
            {[...(field.hitPointEntries ?? [])].sort((a, b) => a.level - b.level).map((entry, i) => (
              <div key={i} className="grid grid-cols-2 gap-1 text-xs">
                <span>{entry.level}</span>
                <span className="font-mono">{entry.hp}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {entries.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No levels added yet</p>
            )}
            <div className="space-y-1.5">
              {entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Lv</span>
                  <LevelSelect value={entry.level} max={maxLevel} onChange={n => handleLevelChange(i, n)} />
                  <span className="text-xs text-muted-foreground">→ HP</span>
                  <Input
                    type="number"
                    min={1}
                    value={entry.hp}
                    onChange={e => handleHpChange(i, parseInt(e.target.value) || 1)}
                    className="h-7 text-sm w-16"
                  />
                  <button onClick={() => remove(i)} className="ml-auto text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleAdd} className="w-full h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add level
            </Button>
          </>
        )}
        {renderProgressionToggle(entries.length > 0)}
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
