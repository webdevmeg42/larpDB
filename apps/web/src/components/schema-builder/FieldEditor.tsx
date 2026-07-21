'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import type { SchemaField, SchemaFieldOption, StatBlockStat, StatLevelEntry, HitPointEntry, AttackEntry, SpellEntry, CharacterSchemaType, CodexLevelConfig } from '@plotrunner/shared'
import { computeCodexLevel } from '@plotrunner/shared'
import { Lock, Trash2, Plus } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'

interface FieldEditorProps {
  field: SchemaField
  onChange: (field: SchemaField) => void
  schemaType?: CharacterSchemaType
  highlightUnlabeled?: boolean
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}

function LevelSelect({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(parseInt(e.target.value))}
      className="rounded border border-input bg-background px-2 py-1 text-sm"
    >
      {Array.from({ length: max + 5 }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  )
}


function getLevelingSystemLabel(sys: string): string {
  switch (sys) {
    case 'percentage': return 'Percentage (×1.5 per level)'
    case 'doubling': return 'Doubling (×2 per level)'
    case 'flat': return 'Flat (constant increment)'
    case 'linear': return 'Linear (constant increment)'
    case 'triangular': return 'Triangular sequence'
    case 'fibonacci': return 'Fibonacci sequence'
    default: return sys
  }
}

export function FieldEditor({ field, onChange, schemaType, highlightUnlabeled }: FieldEditorProps) {
  const { config } = useSiteConfig()
  const maxLevel = config?.codex?.maxLevel ?? 20

  const [showLevelModal, setShowLevelModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [exceedingLevel, setExceedingLevel] = useState(0)
  const [useProgression, setUseProgression] = useState(false)
  useEffect(() => { setUseProgression(false) }, [field.id])

  const codex = config?.codex as (CodexLevelConfig & { maxLevel?: number }) | undefined

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

  function applyProgression(type: 'hitpoints' | 'statblock' | 'attacks' | 'spells') {
    if (!codex?.levelingSystem) return
    const cfg: CodexLevelConfig = {
      levelingSystem: codex.levelingSystem,
      ...(codex.linearIncrement !== undefined ? { linearIncrement: codex.linearIncrement } : {}),
      ...(codex.flatCost !== undefined ? { flatCost: codex.flatCost } : {}),
    }

    if (type === 'hitpoints') {
      const sorted = [...(field.hitPointEntries ?? [])].sort((a, b) => a.level - b.level)
      const base = sorted[0]?.hp ?? 5
      update({ hitPointEntries: Array.from({ length: maxLevel }, (_, i) => ({ level: i + 1, hp: computeCodexLevel(base, i + 1, cfg) })) })
    } else if (type === 'statblock') {
      const stats = field.stats ?? []
      update({ stats: stats.map(stat => {
        const sorted = [...(stat.levelEntries ?? [])].sort((a, b) => a.level - b.level)
        const base = sorted[0]?.value
        if (base == null) return stat
        return { ...stat, levelEntries: Array.from({ length: maxLevel }, (_, i) => ({ level: i + 1, value: computeCodexLevel(base, i + 1, cfg) })) }
      }) })
    } else if (type === 'attacks') {
      const entries = field.attackEntries ?? []
      const sorted = [...entries].sort((a, b) => a.level - b.level)
      const base = sorted[0]?.hitPoints ?? 5
      update({ attackEntries: entries.map(e => ({ ...e, hitPoints: computeCodexLevel(base, e.level, cfg) })) })
    } else if (type === 'spells') {
      const entries = field.spellEntries ?? []
      const sorted = [...entries].sort((a, b) => a.level - b.level)
      const base = sorted[0]?.hitPoints ?? 5
      update({ spellEntries: entries.map(e => ({ ...e, hitPoints: computeCodexLevel(base, e.level, cfg) })) })
    }
  }

  function renderProgressionToggle(type: 'hitpoints' | 'statblock' | 'attacks' | 'spells', hasEntries: boolean) {
    const sys = codex?.levelingSystem
    const isDisabled = !sys || !hasEntries

    function handleToggle(checked: boolean) {
      setUseProgression(checked)
      if (checked && sys && hasEntries) applyProgression(type)
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

  function renderOptionsEditor() {
    const options: SchemaFieldOption[] = field.options ?? []

    function addOption() {
      update({ options: [...options, { value: uuidv4(), label: '' }] })
    }

    function updateOption(index: number, patch: Partial<SchemaFieldOption>) {
      update({ options: options.map((o, i) => i === index ? { ...o, ...patch } : o) })
    }

    function removeOption(index: number) {
      update({ options: options.filter((_, i) => i !== index) })
    }

    return (
      <div className="space-y-2">
        <Label className="text-xs">Options</Label>
        {options.map((opt, i) => (
          <div key={opt.value} className="flex gap-1 items-center">
            <Input
              value={opt.label}
              onChange={e => updateOption(i, { label: e.target.value })}
              placeholder={`Option ${i + 1}`}
              className="h-8 text-xs flex-1"
            />
            <Input
              type="number"
              value={opt.xpCost ?? ''}
              onChange={e => updateOption(i, { xpCost: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaFieldOption>)}
              placeholder="XP"
              className="h-8 text-xs w-16"
              title="XP cost for this option"
            />
            <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addOption} className="w-full h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add option
        </Button>
      </div>
    )
  }

  function renderStatsEditor() {
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
        {renderProgressionToggle('statblock', stats.some(s => (s.levelEntries ?? []).length > 0))}
      </div>
    )
  }

  function renderHitPointsEditor() {
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
        {renderProgressionToggle('hitpoints', entries.length > 0)}
      </div>
    )
  }

  function renderAttacksEditor() {
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
                    <button onClick={() => remove(i)} className="ml-auto text-muted-foreground hover:text-destructive">
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
        {renderProgressionToggle('attacks', entries.length > 0)}
        <div className="flex gap-2 pt-1 border-t">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={addAttack}>
            <Plus className="h-3 w-3 mr-1" /> Add Attack
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={addUpgrade}>
            <Plus className="h-3 w-3 mr-1" /> Add Upgrade
          </Button>
        </div>
      </div>
    )
  }

  function renderSpellsEditor() {
    const entries: SpellEntry[] = field.spellEntries ?? []

    const definedSpellNames = entries
      .filter(e => e.kind === 'new' && e.name.trim() !== '')
      .map(e => e.name)

    function addSpell() {
      const newEntries: SpellEntry[] = [
        { kind: 'new', level: 1, name: '', hitPoints: 5, effects: '' },
        { kind: 'new', level: 2, name: '', hitPoints: 5, effects: '' },
        { kind: 'new', level: 3, name: '', hitPoints: 5, effects: '' },
      ]
      checkLevel(3, () => {
        update({ spellEntries: [...entries, ...newEntries] })
      })
    }

    function addUpgrade() {
      checkLevel(1, () => {
        update({ spellEntries: [...entries, { kind: 'upgrade', level: 1, name: '', spellName: '', hitPoints: 5, effects: '' }] })
      })
    }

    function updateEntry(idx: number, patch: Partial<SpellEntry>) {
      const updated = entries.map((e, i) => i === idx ? { ...e, ...patch } : e) as SpellEntry[]
      if (patch.level !== undefined) {
        checkLevel(patch.level, () => update({ spellEntries: updated }))
      } else {
        update({ spellEntries: updated })
      }
    }

    function remove(idx: number) {
      update({ spellEntries: entries.filter((_, i) => i !== idx) })
    }

    function getHpError(idx: number, entry: SpellEntry): string | null {
      if (entry.kind !== 'upgrade' || !entry.spellName) return null
      const prevHPs = entries
        .filter((e, i) => i !== idx && (e.name === entry.spellName || e.spellName === entry.spellName) && e.level < entry.level)
        .map(e => e.hitPoints)
      if (prevHPs.length === 0) return null
      const maxPrev = Math.max(...prevHPs)
      return entry.hitPoints <= maxPrev ? `Must exceed previous version (${maxPrev} HP)` : null
    }

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide">Spells</p>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No spells added yet</p>
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
                    <button onClick={() => remove(i)} className="ml-auto text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {entry.kind === 'new' ? (
                    <Input
                      value={entry.name}
                      onChange={e => updateEntry(i, { name: e.target.value })}
                      placeholder="Spell name"
                      className="h-7 text-xs"
                    />
                  ) : (
                    <select
                      value={entry.spellName ?? ''}
                      onChange={e => updateEntry(i, { spellName: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="">Select spell to upgrade…</option>
                      {definedSpellNames.map(name => (
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
                  <div className="space-y-1">
                    <Label className="text-xs">Effects</Label>
                    <Textarea
                      value={entry.effects}
                      onChange={e => updateEntry(i, { effects: e.target.value })}
                      placeholder="Describe the spell's effects…"
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {renderProgressionToggle('spells', entries.length > 0)}
        <div className="flex gap-2 pt-1 border-t">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={addSpell}>
            <Plus className="h-3 w-3 mr-1" /> Add Spell
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={addUpgrade}>
            <Plus className="h-3 w-3 mr-1" /> Add Upgrade
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            {field.type === 'select' ? 'Dropdown Select' : field.type} field
          </p>
        </div>

        {field.locked && (
          <div className="flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" />
            Required field — always included
          </div>
        )}

        {schemaType === 'class' && (field.type === 'hitpoints' || field.type === 'attacks' || field.type === 'spells') && (
          <div className="flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" />
            Always locked for players — follows level progression
          </div>
        )}

        {schemaType === 'class' && !field.locked && field.type !== 'hitpoints' && field.type !== 'attacks' && field.type !== 'spells' && (
          <CheckRow
            label="Lock for players (GM only)"
            checked={field.gmOnly === true}
            onChange={v => update({ gmOnly: v || undefined } as Partial<SchemaField>)}
          />
        )}

        <Row label="Label">
          <Input
            data-testid="field-label-input"
            value={field.label}
            onChange={e => update({ label: e.target.value })}
            placeholder="Field label"
            className={cn('h-8 text-sm', highlightUnlabeled && !field.label.trim() && 'border-destructive focus-visible:ring-destructive')}
          />
        </Row>

        {field.type !== 'section' && field.type !== 'equipment' && field.type !== 'hitpoints' && field.type !== 'attacks' && field.type !== 'spells' && (
          <CheckRow
            label="Required"
            checked={field.required}
            onChange={v => update({ required: v })}
          />
        )}

        {field.type === 'number' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Min">
                <Input type="number" value={field.min ?? ''} onChange={e => update({ min: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
              </Row>
              <Row label="Max">
                <Input type="number" value={field.max ?? ''} onChange={e => update({ max: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
              </Row>
            </div>
            <Row label="XP per point">
              <Input type="number" value={field.xpCostPerPoint ?? ''} onChange={e => update({ xpCostPerPoint: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
            </Row>
          </>
        )}

        {field.type === 'toggle' && (
          <Row label="XP cost (to toggle on)">
            <Input type="number" value={field.xpCost ?? ''} onChange={e => update({ xpCost: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
          </Row>
        )}

        {(field.type === 'select' || field.type === 'multiselect') && renderOptionsEditor()}

        {field.type === 'multiselect' && (
          <Row label="Max selections (blank = unlimited)">
            <Input type="number" value={field.maxSelections ?? ''} onChange={e => update({ maxSelections: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm" />
          </Row>
        )}

        {field.type === 'statblock' && renderStatsEditor()}

        {field.type === 'equipment' && (
          <>
            <Row label="Equipment slots (0 – 20)">
              <Input type="number" min={0} max={20} value={field.equipmentSlots ?? ''} onChange={e => update({ equipmentSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
            </Row>
            <Row label="Treasure slots (0 – 20)">
              <Input type="number" min={0} max={20} value={field.treasureSlots ?? ''} onChange={e => update({ treasureSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
            </Row>
          </>
        )}

        {field.type === 'personality' && (
          <>
            <Row label="Personality trait slots (0 – 8)">
              <Input type="number" min={0} max={8} value={field.personalityTraitSlots ?? ''} onChange={e => update({ personalityTraitSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
            </Row>
            <Row label="Ideal slots (0 – 6)">
              <Input type="number" min={0} max={6} value={field.idealSlots ?? ''} onChange={e => update({ idealSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
            </Row>
            <Row label="Bond slots (0 – 6)">
              <Input type="number" min={0} max={6} value={field.bondSlots ?? ''} onChange={e => update({ bondSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
            </Row>
            <Row label="Flaw slots (0 – 6)">
              <Input type="number" min={0} max={6} value={field.flawSlots ?? ''} onChange={e => update({ flawSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
            </Row>
          </>
        )}

        {field.type === 'features' && (
          <Row label="Feature slots (0 – 20)">
            <Input type="number" min={0} max={20} value={field.featureSlots ?? ''} onChange={e => update({ featureSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
          </Row>
        )}

        {field.type === 'influences' && (
          <Row label="Influence slots (0 – 10)">
            <Input type="number" min={0} max={10} value={field.influenceSlots ?? ''} onChange={e => update({ influenceSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
          </Row>
        )}

        {field.type === 'languages' && (
          <Row label="Language slots (0 – 10)">
            <Input type="number" min={0} max={10} value={field.languageSlots ?? ''} onChange={e => update({ languageSlots: e.target.value ? Number(e.target.value) : undefined } as Partial<SchemaField>)} className="h-8 text-sm max-w-[100px]" />
          </Row>
        )}

        {field.type === 'appearance' && (
          <p className="text-xs text-muted-foreground">
            Includes: Age, Height, Weight, Eyes, Skin, Hair, and a Character Appearance description. No configuration needed.
          </p>
        )}

        {field.type === 'hitpoints' && renderHitPointsEditor()}
        {field.type === 'attacks' && renderAttacksEditor()}
        {field.type === 'spells' && renderSpellsEditor()}
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
