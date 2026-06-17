'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { SiteConfig, GameCodex, LevelingSystemType, Faction } from '@larpdb/shared'
import { DatePicker } from '@/components/ui/date-picker'

interface Props {
  config: SiteConfig | null
  reload: () => void
}

/** Build a GameCodex patch object that omits empty strings (exactOptionalPropertyTypes safe). */
function pick(obj: Record<string, string>): Partial<GameCodex> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v) result[k] = v
  }
  return result as Partial<GameCodex>
}

export default function CodexTab({ config, reload }: Props) {
  const [codex, setCodex] = useState<GameCodex>({})

  useEffect(() => {
    if (!config) return
    setCodex(config.codex ?? {})
  }, [config])

  async function saveSection(updates: Partial<GameCodex>) {
    const merged = { ...codex, ...updates }
    await api.patch<SiteConfig>('/config', { codex: merged })
    setCodex(merged)
    reload()
  }

  return (
    <div className="space-y-6">
      <LarpDetailsSection codex={codex} onSave={saveSection} />
      <GameSettingSection codex={codex} onSave={saveSection} />
      <LevelingSystemSection codex={codex} onSave={saveSection} />
      <CharactersSection codex={codex} onSave={saveSection} />
      <LogisticsSection codex={codex} onSave={saveSection} />
      <PeopleSection codex={codex} onSave={saveSection} />
      <LegalSection codex={codex} onSave={saveSection} />
      <ExtrasSection codex={codex} onSave={saveSection} />
    </div>
  )
}

interface SectionProps {
  codex: GameCodex
  onSave: (updates: Partial<GameCodex>) => Promise<void>
}

function useSectionSave(onSave: SectionProps['onSave']) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent, updates: Partial<GameCodex>) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return { saving, saved, handleSubmit }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function LarpDetailsSection({ codex, onSave }: SectionProps) {
  const [form, setForm] = useState({
    eventName: '',
    eventTagline: '',
    eventAbout: '',
    eventStartDate: '',
    eventEndDate: '',
    locationName: '',
    keyTimes: '',
    travelNotes: '',
  })
  const { saving, saved, handleSubmit } = useSectionSave(onSave)

  useEffect(() => {
    setForm({
      eventName: codex.eventName ?? '',
      eventTagline: codex.eventTagline ?? '',
      eventAbout: codex.eventAbout ?? '',
      eventStartDate: codex.eventStartDate ?? '',
      eventEndDate: codex.eventEndDate ?? '',
      locationName: codex.locationName ?? '',
      keyTimes: codex.keyTimes ?? '',
      travelNotes: codex.travelNotes ?? '',
    })
  }, [codex])

  return (
    <Card>
      <CardHeader><CardTitle>LARP Details</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={e => void handleSubmit(e, pick(form))}
          className="space-y-4"
        >
          <Field label="Event name">
            <Input value={form.eventName} onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))} placeholder="The Siege of Thornwall" />
          </Field>
          <Field label="Tagline">
            <Input value={form.eventTagline} onChange={e => setForm(f => ({ ...f, eventTagline: e.target.value }))} placeholder="1–2 sentence hook" />
          </Field>
          <Field label="About this event">
            <Textarea rows={8} value={form.eventAbout} onChange={e => setForm(f => ({ ...f, eventAbout: e.target.value }))} placeholder="2–4 paragraphs about the event" />
          </Field>
          <Field label="Event start date">
            <DatePicker
              value={form.eventStartDate || undefined}
              onChange={val => setForm(f => ({ ...f, eventStartDate: val ?? '' }))}
              placeholder="Pick start date"
            />
          </Field>
          <Field label="Event end date">
            <DatePicker
              value={form.eventEndDate || undefined}
              onChange={val => setForm(f => ({ ...f, eventEndDate: val ?? '' }))}
              placeholder="Pick end date"
            />
          </Field>
          <Field label="Location name + address">
            <Textarea rows={2} value={form.locationName} onChange={e => setForm(f => ({ ...f, locationName: e.target.value }))} />
          </Field>
          <Field label="Key times">
            <Textarea rows={3} value={form.keyTimes} onChange={e => setForm(f => ({ ...f, keyTimes: e.target.value }))} placeholder="Check-in, game-on, game-off, check-out" />
          </Field>
          <Field label="Parking / travel / accessibility notes">
            <Textarea rows={4} value={form.travelNotes} onChange={e => setForm(f => ({ ...f, travelNotes: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

const EMPTY_FACTION: Faction = { name: '', description: '' }

function GameSettingSection({ codex, onSave }: SectionProps) {
  const [form, setForm] = useState({
    genre: '',
    tone: '',
    worldLore: '',
    safetyMechanics: '',
    contentWarnings: '',
  })
  const [factionCount, setFactionCount] = useState(1)
  const [factions, setFactions] = useState<Faction[]>([{ ...EMPTY_FACTION }])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm({
      genre: codex.genre ?? '',
      tone: codex.tone ?? '',
      worldLore: codex.worldLore ?? '',
      safetyMechanics: codex.safetyMechanics ?? '',
      contentWarnings: codex.contentWarnings ?? '',
    })
    // Handle legacy freeform string or new structured array
    const raw = codex.factions as Faction[] | string | undefined
    if (Array.isArray(raw) && raw.length > 0) {
      setFactions(raw)
      setFactionCount(raw.length)
    } else if (typeof raw === 'string' && raw) {
      setFactions([{ name: '', description: raw }])
      setFactionCount(1)
    } else {
      setFactions([{ ...EMPTY_FACTION }])
      setFactionCount(1)
    }
  }, [codex])

  function changeFactionCount(n: number) {
    setFactionCount(n)
    setFactions(prev =>
      n > prev.length
        ? [...prev, ...Array.from({ length: n - prev.length }, () => ({ ...EMPTY_FACTION }))]
        : prev.slice(0, n),
    )
  }

  function updateFaction(i: number, patch: Partial<Faction>) {
    setFactions(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...pick(form), factions })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>The Game &amp; Setting</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <Field label="Genre">
            <Input value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="high fantasy, post-apocalyptic" />
          </Field>
          <Field label="Tone">
            <Input value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} placeholder="gritty, epic, comedic" />
          </Field>
          <Field label="World / lore overview">
            <Textarea rows={10} value={form.worldLore} onChange={e => setForm(f => ({ ...f, worldLore: e.target.value }))} placeholder="Setting primer for new players" />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label>Factions, houses, or groups</Label>
              <select
                value={factionCount}
                onChange={e => changeFactionCount(parseInt(e.target.value, 10))}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {factions.map((faction, i) => (
                <div key={i} className="rounded-md border p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {factionCount > 1 ? `Group ${i + 1}` : 'Group'}
                  </p>
                  <Field label="Name">
                    <Input
                      value={faction.name}
                      onChange={e => updateFaction(i, { name: e.target.value })}
                      placeholder="e.g. The Iron Brotherhood"
                    />
                  </Field>
                  <Field label="Description">
                    <Textarea
                      rows={2}
                      value={faction.description}
                      onChange={e => updateFaction(i, { description: e.target.value })}
                      placeholder="1–2 sentences players will see when choosing this group"
                    />
                  </Field>
                </div>
              ))}
            </div>
          </div>

          <Field label="Safety mechanics in use">
            <Input value={form.safetyMechanics} onChange={e => setForm(f => ({ ...f, safetyMechanics: e.target.value }))} placeholder="X-card, BRAKE/GAS, Lookdown" />
          </Field>
          <Field label="Content warnings">
            <Textarea rows={4} value={form.contentWarnings} onChange={e => setForm(f => ({ ...f, contentWarnings: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

const LEVELING_SYSTEMS: {
  value: LevelingSystemType
  label: string
  costs: string
  description: string
}[] = [
  {
    value: 'fibonacci',
    label: 'Fibonacci sequence',
    costs: '1, 2, 3, 5, 8, 13, 21, 34…',
    description: 'Each level costs the sum of the previous two. Starts gentle, accelerates fast — good for systems where early levels are cheap "tastes" but mastery is a long grind.',
  },
  {
    value: 'linear',
    label: 'Linear / arithmetic',
    costs: '5, 10, 15, 20, 25, 30…',
    description: 'Each level costs a fixed increment more than the last. Predictable, easy for players to plan around — "I need 5 more XP per level than last time."',
  },
  {
    value: 'flat',
    label: 'Flat cost',
    costs: '10, 10, 10, 10, 10…',
    description: 'Every level costs the same. Simplest possible system — good for shorter LARPs where you don\'t want grinding to dominate, just steady progression.',
  },
  {
    value: 'doubling',
    label: 'Doubling (geometric ×2)',
    costs: '5, 10, 20, 40, 80, 160…',
    description: 'Each level costs double the last. Very front-loaded — early levels feel fast, but high levels become serious commitments. Good for making "max level" feel prestigious.',
  },
  {
    value: 'triangular',
    label: 'Triangular numbers',
    costs: '1, 3, 6, 10, 15, 21, 28…',
    description: 'Cumulative sum of 1+2+3+4… Similar feel to Fibonacci but smoother/less explosive — a gentler escalation curve.',
  },
  {
    value: 'percentage',
    label: 'Percentage-based (round numbers)',
    costs: '10, 15, 23, 34, 51, 77… (each ~1.5× the last, rounded)',
    description: 'Smoother escalation than doubling, still simple if you provide players a lookup table rather than asking them to do the math live.',
  },
]

function computeCumulativeXP(
  system: LevelingSystemType | '',
  level: number,
  linearIncrement: number,
  flatCost: number,
): number | null {
  if (!system || level < 1) return null
  switch (system) {
    case 'linear':
      if (linearIncrement <= 0) return null
      return linearIncrement * level * (level + 1) / 2
    case 'flat':
      if (flatCost <= 0) return null
      return flatCost * level
    case 'doubling':
      return 5 * (Math.pow(2, level) - 1)
    case 'triangular':
      return level * (level + 1) * (level + 2) / 6
    case 'fibonacci': {
      if (level === 1) return 1
      let total = 3, a = 1, b = 2
      for (let n = 3; n <= level; n++) { const next = a + b; total += next; a = b; b = next }
      return total
    }
    case 'percentage': {
      let total = 0
      for (let n = 1; n <= level; n++) total += Math.round(10 * Math.pow(1.5, n - 1))
      return total
    }
    default: return null
  }
}

function LevelingSystemSection({ codex, onSave }: SectionProps) {
  const [system, setSystem] = useState<LevelingSystemType | ''>('')
  const [maxLevelStr, setMaxLevelStr] = useState('')
  const [baseLevelStr, setBaseLevelStr] = useState('')
  const [linearIncrementStr, setLinearIncrementStr] = useState('')
  const [flatCostStr, setFlatCostStr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [levelIncrease, setLevelIncrease] = useState({ from: 0, to: 0 })

  useEffect(() => {
    setSystem(codex.levelingSystem ?? '')
    setMaxLevelStr(codex.maxLevel?.toString() ?? '')
    setBaseLevelStr(codex.baseLevel?.toString() ?? '')
    setLinearIncrementStr(codex.linearIncrement?.toString() ?? '')
    setFlatCostStr(codex.flatCost?.toString() ?? '')
  }, [codex])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const prevMax = codex.maxLevel ?? 0
      const newMax = maxLevelStr ? parseInt(maxLevelStr, 10) : undefined
      const newBaseLevel = baseLevelStr ? parseInt(baseLevelStr, 10) : undefined
      const updates: Partial<GameCodex> = {}
      if (system) updates.levelingSystem = system
      if (newMax !== undefined) updates.maxLevel = newMax
      if (newBaseLevel !== undefined) updates.baseLevel = newBaseLevel
      if (system === 'linear' && linearIncrementStr) updates.linearIncrement = parseInt(linearIncrementStr, 10)
      if (system === 'flat' && flatCostStr) updates.flatCost = parseInt(flatCostStr, 10)
      await onSave(updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (newMax && prevMax > 0 && newMax > prevMax) {
        setLevelIncrease({ from: prevMax, to: newMax })
        setShowModal(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Leveling System</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={e => void handleSave(e)} className="space-y-6">
            <div className="space-y-4">
              {LEVELING_SYSTEMS.map(opt => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="levelingSystem"
                    value={opt.value}
                    checked={system === opt.value}
                    onChange={() => setSystem(opt.value)}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none mb-1">{opt.label}</p>
                    <p className="text-xs font-mono text-muted-foreground mb-0.5">{opt.costs}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                    {opt.value === 'linear' && system === 'linear' && (
                      <div className="mt-3 space-y-1" onClick={e => e.stopPropagation()}>
                        <Label className="text-xs">Fixed XP increment per level</Label>
                        <Input
                          type="number"
                          min={1}
                          value={linearIncrementStr}
                          onChange={e => setLinearIncrementStr(e.target.value)}
                          placeholder="5"
                          className="max-w-[120px] h-8 text-sm"
                        />
                        <p className="text-xs text-muted-foreground">e.g. 5 → costs 5, 10, 15, 20…</p>
                      </div>
                    )}
                    {opt.value === 'flat' && system === 'flat' && (
                      <div className="mt-3 space-y-1" onClick={e => e.stopPropagation()}>
                        <Label className="text-xs">XP cost per level</Label>
                        <Input
                          type="number"
                          min={1}
                          value={flatCostStr}
                          onChange={e => setFlatCostStr(e.target.value)}
                          placeholder="10"
                          className="max-w-[120px] h-8 text-sm"
                        />
                        <p className="text-xs text-muted-foreground">e.g. 10 → same cost every level</p>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {(() => {
              const levelCap = maxLevelStr ? Math.min(parseInt(maxLevelStr, 10), 100) : 20
              const baseLevel = baseLevelStr ? parseInt(baseLevelStr, 10) : 0
              const linInc = linearIncrementStr ? parseInt(linearIncrementStr, 10) : 0
              const flatC = flatCostStr ? parseInt(flatCostStr, 10) : 0
              const baseLevelXP = computeCumulativeXP(system, baseLevel, linInc, flatC)
              const needsParam = baseLevel > 0 && (
                (system === 'linear' && !linInc) || (system === 'flat' && !flatC)
              )
              return (
                <div className="flex flex-wrap gap-8 pt-2 border-t">
                  <div className="space-y-1">
                    <Label>Max level</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={maxLevelStr}
                      onChange={e => setMaxLevelStr(e.target.value)}
                      placeholder="e.g. 10"
                      className="max-w-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">Highest level a character can reach.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Base level</Label>
                    <select
                      value={baseLevelStr}
                      onChange={e => setBaseLevelStr(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="">—</option>
                      {Array.from({ length: levelCap }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {baseLevelXP !== null
                        ? `${baseLevelXP.toLocaleString()} XP to reach this level`
                        : needsParam
                          ? 'Set the parameter above to see XP'
                          : !system && baseLevel > 0
                            ? 'Select a leveling system to see XP'
                            : 'Starting level for new characters.'}
                    </p>
                  </div>
                </div>
              )
            })()}

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Max level increased</DialogTitle>
        <DialogDescription>
          You raised the max level from {levelIncrease.from} to {levelIncrease.to}.
          Remember to add new spells, attacks, and abilities to your class builds
          for levels {levelIncrease.from + 1} through {levelIncrease.to}.
        </DialogDescription>
        <div className="flex justify-end">
          <Button onClick={() => setShowModal(false)}>Got it</Button>
        </div>
      </Dialog>
    </>
  )
}

function CharactersSection({ codex, onSave }: SectionProps) {
  const [form, setForm] = useState({
    registrationInfo: '',
    rulebookLink: '',
    classesInfo: '',
    prebuiltCharacters: '',
  })
  const { saving, saved, handleSubmit } = useSectionSave(onSave)

  useEffect(() => {
    setForm({
      registrationInfo: codex.registrationInfo ?? '',
      rulebookLink: codex.rulebookLink ?? '',
      classesInfo: codex.classesInfo ?? '',
      prebuiltCharacters: codex.prebuiltCharacters ?? '',
    })
  }, [codex])

  return (
    <Card>
      <CardHeader><CardTitle>Characters &amp; Participation</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={e => void handleSubmit(e, pick(form))}
          className="space-y-4"
        >
          <Field label="How to register / create a character">
            <Textarea rows={4} value={form.registrationInfo} onChange={e => setForm(f => ({ ...f, registrationInfo: e.target.value }))} />
          </Field>
          <Field label="Rulebook link">
            <Input value={form.rulebookLink} onChange={e => setForm(f => ({ ...f, rulebookLink: e.target.value }))} placeholder="https://…" />
          </Field>
          <Field label="Available classes, skills, or archetypes">
            <Textarea rows={6} value={form.classesInfo} onChange={e => setForm(f => ({ ...f, classesInfo: e.target.value }))} />
          </Field>
          <Field label="Pre-built characters available">
            <Textarea rows={3} value={form.prebuiltCharacters} onChange={e => setForm(f => ({ ...f, prebuiltCharacters: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function LogisticsSection({ codex, onSave }: SectionProps) {
  const [form, setForm] = useState({
    whatToBring: '',
    whatProvided: '',
    ticketTiers: '',
    registrationOpenDate: '',
    registrationCloseDate: '',
    cancellationPolicy: '',
  })
  const { saving, saved, handleSubmit } = useSectionSave(onSave)

  useEffect(() => {
    setForm({
      whatToBring: codex.whatToBring ?? '',
      whatProvided: codex.whatProvided ?? '',
      ticketTiers: codex.ticketTiers ?? '',
      registrationOpenDate: codex.registrationOpenDate ?? '',
      registrationCloseDate: codex.registrationCloseDate ?? '',
      cancellationPolicy: codex.cancellationPolicy ?? '',
    })
  }, [codex])

  return (
    <Card>
      <CardHeader><CardTitle>Logistics</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={e => void handleSubmit(e, pick(form))}
          className="space-y-4"
        >
          <Field label="What to bring">
            <Textarea rows={6} value={form.whatToBring} onChange={e => setForm(f => ({ ...f, whatToBring: e.target.value }))} placeholder="Costume requirements, weapon policies, camping gear…" />
          </Field>
          <Field label="What's provided">
            <Textarea rows={4} value={form.whatProvided} onChange={e => setForm(f => ({ ...f, whatProvided: e.target.value }))} placeholder="Meals, lodging, loaner gear…" />
          </Field>
          <Field label="Ticket tiers + prices">
            <Textarea rows={6} value={form.ticketTiers} onChange={e => setForm(f => ({ ...f, ticketTiers: e.target.value }))} />
          </Field>
          <Field label="Registration open date">
            <DatePicker
              value={form.registrationOpenDate || undefined}
              onChange={val => setForm(f => ({ ...f, registrationOpenDate: val ?? '' }))}
              placeholder="Pick open date"
            />
          </Field>
          <Field label="Registration close date">
            <DatePicker
              value={form.registrationCloseDate || undefined}
              onChange={val => setForm(f => ({ ...f, registrationCloseDate: val ?? '' }))}
              placeholder="Pick close date"
            />
          </Field>
          <Field label="Cancellation / refund policy">
            <Textarea rows={4} value={form.cancellationPolicy} onChange={e => setForm(f => ({ ...f, cancellationPolicy: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PeopleSection({ codex, onSave }: SectionProps) {
  const [form, setForm] = useState({
    organizerTeam: '',
    contactEmail: '',
    socialMedia: '',
    npcCall: '',
  })
  const { saving, saved, handleSubmit } = useSectionSave(onSave)

  useEffect(() => {
    setForm({
      organizerTeam: codex.organizerTeam ?? '',
      contactEmail: codex.contactEmail ?? '',
      socialMedia: codex.socialMedia ?? '',
      npcCall: codex.npcCall ?? '',
    })
  }, [codex])

  return (
    <Card>
      <CardHeader><CardTitle>People &amp; Contact</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={e => void handleSubmit(e, pick(form))}
          className="space-y-4"
        >
          <Field label="Organizer / team names and roles">
            <Textarea rows={4} value={form.organizerTeam} onChange={e => setForm(f => ({ ...f, organizerTeam: e.target.value }))} placeholder="Game Director, Logistics Lead, Head of Props…" />
          </Field>
          <Field label="Primary contact email">
            <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
          </Field>
          <Field label="Social media handles + Discord">
            <Textarea rows={3} value={form.socialMedia} onChange={e => setForm(f => ({ ...f, socialMedia: e.target.value }))} />
          </Field>
          <Field label="NPC / volunteer call">
            <Textarea rows={4} value={form.npcCall} onChange={e => setForm(f => ({ ...f, npcCall: e.target.value }))} placeholder="Perks for joining the crew…" />
          </Field>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function LegalSection({ codex, onSave }: SectionProps) {
  const [form, setForm] = useState({
    ageRestrictions: '',
    codeOfConduct: '',
    liabilityWaiver: '',
  })
  const { saving, saved, handleSubmit } = useSectionSave(onSave)

  useEffect(() => {
    setForm({
      ageRestrictions: codex.ageRestrictions ?? '',
      codeOfConduct: codex.codeOfConduct ?? '',
      liabilityWaiver: codex.liabilityWaiver ?? '',
    })
  }, [codex])

  return (
    <Card>
      <CardHeader><CardTitle>Legal &amp; Housekeeping</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={e => void handleSubmit(e, pick(form))}
          className="space-y-4"
        >
          <Field label="Age restrictions">
            <Input value={form.ageRestrictions} onChange={e => setForm(f => ({ ...f, ageRestrictions: e.target.value }))} placeholder="18+, 16+ with guardian, all ages" />
          </Field>
          <Field label="Code of conduct">
            <Textarea rows={8} value={form.codeOfConduct} onChange={e => setForm(f => ({ ...f, codeOfConduct: e.target.value }))} />
          </Field>
          <Field label="Liability waiver">
            <Textarea rows={4} value={form.liabilityWaiver} onChange={e => setForm(f => ({ ...f, liabilityWaiver: e.target.value }))} placeholder="Confirmed? Link? Handled at check-in?" />
          </Field>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ExtrasSection({ codex, onSave }: SectionProps) {
  const [form, setForm] = useState({
    faq: '',
    testimonials: '',
    mediaLinks: '',
    sponsors: '',
    anythingElse: '',
  })
  const { saving, saved, handleSubmit } = useSectionSave(onSave)

  useEffect(() => {
    setForm({
      faq: codex.faq ?? '',
      testimonials: codex.testimonials ?? '',
      mediaLinks: codex.mediaLinks ?? '',
      sponsors: codex.sponsors ?? '',
      anythingElse: codex.anythingElse ?? '',
    })
  }, [codex])

  return (
    <Card>
      <CardHeader><CardTitle>Optional Extras</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={e => void handleSubmit(e, pick(form))}
          className="space-y-4"
        >
          <Field label="FAQ">
            <Textarea rows={8} value={form.faq} onChange={e => setForm(f => ({ ...f, faq: e.target.value }))} placeholder="Questions you always get asked" />
          </Field>
          <Field label="Quotes / testimonials">
            <Textarea rows={6} value={form.testimonials} onChange={e => setForm(f => ({ ...f, testimonials: e.target.value }))} />
          </Field>
          <Field label="Photos / videos (links)">
            <Textarea rows={3} value={form.mediaLinks} onChange={e => setForm(f => ({ ...f, mediaLinks: e.target.value }))} placeholder="Links to shared folders, drives, etc." />
          </Field>
          <Field label="Sponsors or partners">
            <Textarea rows={4} value={form.sponsors} onChange={e => setForm(f => ({ ...f, sponsors: e.target.value }))} />
          </Field>
          <Field label="Anything else">
            <Textarea rows={4} value={form.anythingElse} onChange={e => setForm(f => ({ ...f, anythingElse: e.target.value }))} />
          </Field>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
