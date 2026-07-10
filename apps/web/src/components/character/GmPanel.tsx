'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Character, GmData, GmCondition } from '@plotrunner/shared'

interface Props {
  character: Character
  onRefresh: () => Promise<void>
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function useSave() {
  const [state, setState] = useState<SaveState>('idle')
  async function save(fn: () => Promise<void>) {
    setState('saving')
    try {
      await fn()
      setState('saved')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }
  const label = state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved!' : state === 'error' ? 'Error — try again' : 'Save'
  return { save, label, saving: state === 'saving' }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}

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

export function GmPanel({ character, onRefresh }: Props) {
  const gm: GmData = character.gmData ?? {}
  const id = character.id

  async function patchGmData(updates: Partial<GmData>) {
    const merged: GmData = { ...gm, ...updates }
    await api.patch(`/characters/${id}/gm-data`, merged)
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <XpSection characterId={id} onRefresh={onRefresh} />
      <ProgressionSection gm={gm} onSave={patchGmData} />
      <ResourcesSection gm={gm} onSave={patchGmData} />
      <HealthSection gm={gm} onSave={patchGmData} />
      <ConditionsSection gm={gm} onSave={patchGmData} />
    </div>
  )
}

function XpSection({ characterId, onRefresh }: { characterId: string; onRefresh: () => Promise<void> }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const { save, label, saving } = useSave()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(amount, 10)
    if (!n || !reason.trim()) return
    await save(async () => {
      await api.post(`/characters/${characterId}/xp/award`, { amount: n, reason: reason.trim() })
      await onRefresh()
      setAmount('')
      setReason('')
    })
  }

  return (
    <Section title="Award / Deduct XP">
      <form onSubmit={e => void handleSubmit(e)} className="space-y-3">
        <div className="flex gap-3 items-end">
          <Field label="Amount (negative to deduct)">
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="+10 or -5"
              className="w-36"
            />
          </Field>
          <Field label="Reason">
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Completed the Vale initiation"
              className="w-full"
              required
            />
          </Field>
        </div>
        <Button type="submit" size="sm" disabled={saving || isNaN(parseInt(amount, 10)) || parseInt(amount, 10) === 0 || !reason.trim()}>
          {label}
        </Button>
      </form>
    </Section>
  )
}

function ProgressionSection({ gm, onSave }: { gm: GmData; onSave: (u: Partial<GmData>) => Promise<void> }) {
  const [milestones, setMilestones] = useState<string[]>(gm.milestones ?? [])
  const [newMilestone, setNewMilestone] = useState('')
  const { save, label, saving } = useSave()

  useEffect(() => { setMilestones(gm.milestones ?? []) }, [gm.milestones])

  function addMilestone() {
    const trimmed = newMilestone.trim()
    if (!trimmed || milestones.includes(trimmed)) return
    setMilestones(prev => [...prev, trimmed])
    setNewMilestone('')
  }

  function removeMilestone(i: number) {
    setMilestones(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <Section title="Progression — Milestones">
      <div className="space-y-2">
        {milestones.length === 0 && (
          <p className="text-xs text-muted-foreground">No milestones yet.</p>
        )}
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm flex-1">{m}</span>
            <button
              type="button"
              onClick={() => removeMilestone(i)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={newMilestone}
            onChange={e => setNewMilestone(e.target.value)}
            placeholder="Completed the Vale initiation"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMilestone() } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addMilestone}>Add</Button>
        </div>
      </div>
      <Button
        size="sm"
        disabled={saving}
        onClick={() => void save(() => onSave({ milestones }))}
      >
        {label}
      </Button>
    </Section>
  )
}

function ResourcesSection({ gm, onSave }: { gm: GmData; onSave: (u: Partial<GmData>) => Promise<void> }) {
  const [currency, setCurrency] = useState(gm.currency?.toString() ?? '')
  const [consumables, setConsumables] = useState(gm.consumables ?? [])
  const [inventory, setInventory] = useState(gm.inventory ?? [])
  const [crafting, setCrafting] = useState(gm.craftingMaterials ?? [])
  const { save, label, saving } = useSave()

  useEffect(() => {
    setCurrency(gm.currency?.toString() ?? '')
    setConsumables(gm.consumables ?? [])
    setInventory(gm.inventory ?? [])
    setCrafting(gm.craftingMaterials ?? [])
  }, [gm])

  return (
    <Section title="Resources">
      <Field label="Currency / gold">
        <Input
          type="number"
          min={0}
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          placeholder="0"
          className="w-36"
        />
      </Field>

      <div className="space-y-2">
        <Label className="text-sm">Consumables</Label>
        {consumables.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={c.name}
              onChange={e => setConsumables(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              placeholder="Healing Potion"
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              value={c.count}
              onChange={e => setConsumables(prev => prev.map((x, j) => j === i ? { ...x, count: parseInt(e.target.value, 10) || 0 } : x))}
              className="w-20"
            />
            <button type="button" onClick={() => setConsumables(p => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setConsumables(p => [...p, { name: '', count: 1 }])}>
          + Add consumable
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Inventory items</Label>
        {inventory.map((item, i) => (
          <div key={i} className="rounded border p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <Input
                value={item.name}
                onChange={e => setInventory(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                placeholder="Item name"
                className="flex-1"
              />
              <button type="button" onClick={() => setInventory(p => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
            </div>
            <Input
              value={item.description ?? ''}
              onChange={e => setInventory(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
              placeholder="Description (optional)"
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setInventory(p => [...p, { name: '' }])}>
          + Add item
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Crafting materials</Label>
        {crafting.map((m, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={m.name}
              onChange={e => setCrafting(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              placeholder="Iron ore"
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              value={m.count}
              onChange={e => setCrafting(prev => prev.map((x, j) => j === i ? { ...x, count: parseInt(e.target.value, 10) || 0 } : x))}
              className="w-20"
            />
            <button type="button" onClick={() => setCrafting(p => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setCrafting(p => [...p, { name: '', count: 1 }])}>
          + Add material
        </Button>
      </div>

      <Button
        size="sm"
        disabled={saving}
        onClick={() => void save(() => {
          const patch: Partial<GmData> = {
            consumables: consumables.filter(c => c.name.trim()),
            inventory: inventory.filter(i => i.name.trim()),
            craftingMaterials: crafting.filter(m => m.name.trim()),
          }
          if (currency !== '') patch.currency = parseInt(currency, 10)
          return onSave(patch)
        })}
      >
        {label}
      </Button>
    </Section>
  )
}

function HealthSection({ gm, onSave }: { gm: GmData; onSave: (u: Partial<GmData>) => Promise<void> }) {
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

function ConditionsSection({ gm, onSave }: { gm: GmData; onSave: (u: Partial<GmData>) => Promise<void> }) {
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
