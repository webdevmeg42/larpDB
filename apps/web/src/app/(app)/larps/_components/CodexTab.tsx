'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { SiteConfig, GameCodex, LevelingSystemType, Faction, AdditionalWebsite } from '@larpdb/shared'

interface Props {
  config: SiteConfig | null
  reload: () => void
}

interface SectionProps {
  codex: GameCodex
}

type SectionResult = { valid: true; data: Partial<GameCodex> } | { valid: false; error: string }
type SectionRef = { getData(): SectionResult }

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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationSummary, setValidationSummary] = useState<string[]>([])

  const gameSettingRef = useRef<SectionRef>(null)
  const levelingRef = useRef<SectionRef>(null)
  const logisticsRef = useRef<SectionRef>(null)
  const peopleRef = useRef<SectionRef>(null)
  const legalRef = useRef<SectionRef>(null)
  const extrasRef = useRef<SectionRef>(null)

  useEffect(() => {
    if (!config) return
    setCodex(config.codex ?? {})
  }, [config])

  async function handleSave() {
    const sections = [gameSettingRef, levelingRef, logisticsRef, peopleRef, legalRef, extrasRef]
    const results = sections.map(r => r.current?.getData() ?? { valid: true as const, data: {} })
    const errors = results.filter((r): r is { valid: false; error: string } => !r.valid).map(r => r.error)
    if (errors.length > 0) {
      setValidationSummary(errors)
      return
    }
    setValidationSummary([])
    const data = results.map(r => r.valid ? r.data : {})
    const merged = { ...codex, ...Object.assign({}, ...data) }
    setSaving(true)
    setError(null)
    try {
      await api.patch<SiteConfig>('/config', { codex: merged })
      setCodex(merged)
      reload()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(getErrorMessage(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <GameSettingSection ref={gameSettingRef} codex={codex} />
      <LevelingSystemSection ref={levelingRef} codex={codex} />
      <LogisticsSection ref={logisticsRef} codex={codex} />
      <PeopleSection ref={peopleRef} codex={codex} />
      <LegalSection ref={legalRef} codex={codex} />
      <ExtrasSection ref={extrasRef} codex={codex} />
      {validationSummary.length > 0 && (
        <p className="text-sm text-destructive">
          Please fill out the following required fields: {validationSummary.join(', ')}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
      </Button>
    </div>
  )
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

const EMPTY_WEBSITE: AdditionalWebsite = { label: '', url: '' }

const SOCIAL_PLATFORMS: { key: keyof GameCodex; label: string; placeholder: string }[] = [
  { key: 'socialFacebook', label: 'Facebook', placeholder: 'https://facebook.com/yourgame' },
  { key: 'socialInstagram', label: 'Instagram', placeholder: 'https://instagram.com/yourgame' },
  { key: 'socialTikTok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourgame' },
  { key: 'socialTwitter', label: 'X / Twitter', placeholder: 'https://x.com/yourgame' },
  { key: 'socialBluesky', label: 'Bluesky', placeholder: 'https://bsky.app/profile/yourgame.bsky.social' },
  { key: 'socialSnapchat', label: 'Snapchat', placeholder: 'https://snapchat.com/add/yourgame' },
  { key: 'socialSubstack', label: 'Substack', placeholder: 'https://yourgame.substack.com' },
  { key: 'socialDiscord', label: 'Discord', placeholder: 'https://discord.gg/invite-code' },
]

export type BrandingSectionRef = { getData: () => Partial<GameCodex> }

export const BrandingSection = forwardRef<BrandingSectionRef, SectionProps>(
  function BrandingSection({ codex }, ref) {
    type SocialForm = Record<string, string>
    const [form, setForm] = useState<SocialForm>({})
    const [websites, setWebsites] = useState<AdditionalWebsite[]>([{ ...EMPTY_WEBSITE }])

    useEffect(() => {
      const next: SocialForm = {}
      for (const p of SOCIAL_PLATFORMS) next[p.key] = (codex[p.key] as string | undefined) ?? ''
      setForm(next)
      const raw = codex.additionalWebsites
      setWebsites(Array.isArray(raw) && raw.length > 0 ? raw : [{ ...EMPTY_WEBSITE }])
    }, [codex])

    useImperativeHandle(ref, () => ({
      getData() {
        const updates: Partial<GameCodex> = {}
        for (const p of SOCIAL_PLATFORMS) {
          if (form[p.key]) (updates as Record<string, unknown>)[p.key] = form[p.key]
        }
        const filledWebsites = websites.filter(w => w.url.trim())
        if (filledWebsites.length > 0) updates.additionalWebsites = filledWebsites
        return updates
      }
    }), [form, websites])

    function updateWebsite(i: number, patch: Partial<AdditionalWebsite>) {
      setWebsites(prev => prev.map((w, idx) => idx === i ? { ...w, ...patch } : w))
    }

    function addWebsite() {
      setWebsites(prev => [...prev, { ...EMPTY_WEBSITE }])
    }

    function removeWebsite(i: number) {
      setWebsites(prev => prev.length === 1 ? [{ ...EMPTY_WEBSITE }] : prev.filter((_, idx) => idx !== i))
    }

    return (
      <Card>
        <CardHeader><CardTitle>Branding &amp; Social Media</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map(p => (
                <Field key={p.key} label={p.label}>
                  <Input
                    value={form[p.key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [p.key]: e.target.value }))}
                    placeholder={p.placeholder}
                    type="url"
                  />
                </Field>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Additional websites</Label>
                <button
                  type="button"
                  onClick={addWebsite}
                  className="text-xs text-primary underline"
                >
                  + Add another
                </button>
              </div>
              {websites.map((w, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input
                    value={w.label}
                    onChange={e => updateWebsite(i, { label: e.target.value })}
                    placeholder="Label (e.g. Our Blog)"
                    className="w-36 shrink-0"
                  />
                  <Input
                    value={w.url}
                    onChange={e => updateWebsite(i, { url: e.target.value })}
                    placeholder="https://…"
                    type="url"
                  />
                  <button
                    type="button"
                    onClick={() => removeWebsite(i)}
                    className="text-muted-foreground hover:text-destructive text-sm mt-2 shrink-0"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)

const EMPTY_FACTION: Faction = { name: '', description: '' }

const GameSettingSection = forwardRef<SectionRef, SectionProps>(
  function GameSettingSection({ codex }, ref) {
    const [form, setForm] = useState({
      genre: '',
      tone: '',
      worldLore: '',
      safetyMechanics: '',
      contentWarnings: '',
    })
    const [factionCount, setFactionCount] = useState(1)
    const [factions, setFactions] = useState<Faction[]>([{ ...EMPTY_FACTION }])
    const [safetyError, setSafetyError] = useState(false)

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

    useImperativeHandle(ref, () => ({
      getData() {
        if (!form.safetyMechanics.trim()) {
          setSafetyError(true)
          return { valid: false as const, error: 'Safety mechanics in use' }
        }
        return { valid: true as const, data: { ...pick(form), factions } }
      }
    }), [form, factions])

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

    return (
      <Card>
        <CardHeader><CardTitle>The Game &amp; Setting</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
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

            <Field label={<>Safety mechanics in use <span className="text-destructive">*</span></>}>
              <Input
                value={form.safetyMechanics}
                onChange={e => { setForm(f => ({ ...f, safetyMechanics: e.target.value })); setSafetyError(false) }}
                placeholder="X-card, BRAKE/GAS, Lookdown"
                className={safetyError ? 'border-destructive' : ''}
              />
              {safetyError && <p className="text-xs text-destructive">Safety mechanics in use is required</p>}
            </Field>
            <Field label="Content warnings">
              <Textarea rows={4} value={form.contentWarnings} onChange={e => setForm(f => ({ ...f, contentWarnings: e.target.value }))} />
            </Field>
          </div>
        </CardContent>
      </Card>
    )
  }
)

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

const LevelingSystemSection = forwardRef<SectionRef, SectionProps>(
  function LevelingSystemSection({ codex }, ref) {
    const [system, setSystem] = useState<LevelingSystemType | ''>('')
    const [maxLevelStr, setMaxLevelStr] = useState('')
    const [baseLevelStr, setBaseLevelStr] = useState('')
    const [linearIncrementStr, setLinearIncrementStr] = useState('')
    const [flatCostStr, setFlatCostStr] = useState('')
    const [systemError, setSystemError] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [levelIncrease, setLevelIncrease] = useState({ from: 0, to: 0 })
    const prevMaxLevelRef = useRef<number | null>(null)

    useEffect(() => {
      setSystem(codex.levelingSystem ?? '')
      setMaxLevelStr(codex.maxLevel?.toString() ?? '')
      setBaseLevelStr(codex.baseLevel?.toString() ?? '')
      setLinearIncrementStr(codex.linearIncrement?.toString() ?? '')
      setFlatCostStr(codex.flatCost?.toString() ?? '')
    }, [codex])

    // Detect max level increases after save to prompt GM to add new build content
    useEffect(() => {
      const curr = codex.maxLevel ?? 0
      if (prevMaxLevelRef.current !== null) {
        const prev = prevMaxLevelRef.current
        if (prev > 0 && curr > prev) {
          setLevelIncrease({ from: prev, to: curr })
          setShowModal(true)
        }
      }
      prevMaxLevelRef.current = curr
    }, [codex.maxLevel])

    useImperativeHandle(ref, () => ({
      getData() {
        if (!system) {
          setSystemError(true)
          return { valid: false as const, error: 'Leveling System' }
        }
        const updates: Partial<GameCodex> = {}
        updates.levelingSystem = system
        const newMax = maxLevelStr ? parseInt(maxLevelStr, 10) : undefined
        if (newMax !== undefined) updates.maxLevel = newMax
        const newBaseLevel = baseLevelStr ? parseInt(baseLevelStr, 10) : undefined
        if (newBaseLevel !== undefined) updates.baseLevel = newBaseLevel
        if (system === 'linear' && linearIncrementStr) updates.linearIncrement = parseInt(linearIncrementStr, 10)
        if (system === 'flat' && flatCostStr) updates.flatCost = parseInt(flatCostStr, 10)
        return { valid: true as const, data: updates }
      }
    }), [system, maxLevelStr, baseLevelStr, linearIncrementStr, flatCostStr])

    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Leveling System <span className="text-destructive text-base font-normal">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                {LEVELING_SYSTEMS.map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="levelingSystem"
                      value={opt.value}
                      checked={system === opt.value}
                      onChange={() => { setSystem(opt.value); setSystemError(false) }}
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
              {systemError && (
                <p className="text-xs text-destructive">Please select a leveling system</p>
              )}

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
            </div>
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
)

const LogisticsSection = forwardRef<SectionRef, SectionProps>(
  function LogisticsSection({ codex }, ref) {
    const [form, setForm] = useState({
      registrationInfo: '',
      whatToBring: '',
      whatProvided: '',
      ticketTiers: '',
      cancellationPolicy: '',
    })

    useEffect(() => {
      setForm({
        registrationInfo: codex.registrationInfo ?? '',
        whatToBring: codex.whatToBring ?? '',
        whatProvided: codex.whatProvided ?? '',
        ticketTiers: codex.ticketTiers ?? '',
        cancellationPolicy: codex.cancellationPolicy ?? '',
      })
    }, [codex])

    useImperativeHandle(ref, () => ({
      getData() { return { valid: true as const, data: pick(form) } }
    }), [form])

    return (
      <Card>
        <CardHeader><CardTitle>Logistics</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Field label="How to register / create a character">
              <Textarea rows={4} value={form.registrationInfo} onChange={e => setForm(f => ({ ...f, registrationInfo: e.target.value }))} />
            </Field>
            <Field label="What to bring">
              <Textarea rows={6} value={form.whatToBring} onChange={e => setForm(f => ({ ...f, whatToBring: e.target.value }))} placeholder="Costume requirements, weapon policies, camping gear…" />
            </Field>
            <Field label="What's provided">
              <Textarea rows={4} value={form.whatProvided} onChange={e => setForm(f => ({ ...f, whatProvided: e.target.value }))} placeholder="Meals, lodging, loaner gear…" />
            </Field>
            <Field label="Ticket tiers + prices">
              <Textarea rows={6} value={form.ticketTiers} onChange={e => setForm(f => ({ ...f, ticketTiers: e.target.value }))} />
            </Field>
            <Field label="Cancellation / refund policy">
              <Textarea rows={4} value={form.cancellationPolicy} onChange={e => setForm(f => ({ ...f, cancellationPolicy: e.target.value }))} />
            </Field>
          </div>
        </CardContent>
      </Card>
    )
  }
)

const PeopleSection = forwardRef<SectionRef, SectionProps>(
  function PeopleSection({ codex }, ref) {
    const [form, setForm] = useState({
      organizerTeam: '',
      contactEmail: '',
      npcCall: '',
    })

    useEffect(() => {
      setForm({
        organizerTeam: codex.organizerTeam ?? '',
        contactEmail: codex.contactEmail ?? '',
        npcCall: codex.npcCall ?? '',
      })
    }, [codex])

    useImperativeHandle(ref, () => ({
      getData() { return { valid: true as const, data: pick(form) } }
    }), [form])

    return (
      <Card>
        <CardHeader><CardTitle>People &amp; Contact</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Field label="Organizer / team names and roles">
              <Textarea rows={4} value={form.organizerTeam} onChange={e => setForm(f => ({ ...f, organizerTeam: e.target.value }))} placeholder="Game Director, Logistics Lead, Head of Props…" />
            </Field>
            <Field label="Primary contact email">
              <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
            </Field>
            <Field label="NPC / volunteer call">
              <Textarea rows={4} value={form.npcCall} onChange={e => setForm(f => ({ ...f, npcCall: e.target.value }))} placeholder="Perks for joining the crew…" />
            </Field>
          </div>
        </CardContent>
      </Card>
    )
  }
)

const LegalSection = forwardRef<SectionRef, SectionProps>(
  function LegalSection({ codex }, ref) {
    const [form, setForm] = useState({
      ageRestrictions: '',
      codeOfConduct: '',
      liabilityWaiver: '',
    })

    useEffect(() => {
      setForm({
        ageRestrictions: codex.ageRestrictions ?? '',
        codeOfConduct: codex.codeOfConduct ?? '',
        liabilityWaiver: codex.liabilityWaiver ?? '',
      })
    }, [codex])

    useImperativeHandle(ref, () => ({
      getData() { return { valid: true as const, data: pick(form) } }
    }), [form])

    return (
      <Card>
        <CardHeader><CardTitle>Legal &amp; Housekeeping</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Field label="Age restrictions">
              <Input value={form.ageRestrictions} onChange={e => setForm(f => ({ ...f, ageRestrictions: e.target.value }))} placeholder="18+, 16+ with guardian, all ages" />
            </Field>
            <Field label="Code of conduct">
              <Textarea rows={8} value={form.codeOfConduct} onChange={e => setForm(f => ({ ...f, codeOfConduct: e.target.value }))} />
            </Field>
            <Field label="Liability waiver">
              <Textarea rows={4} value={form.liabilityWaiver} onChange={e => setForm(f => ({ ...f, liabilityWaiver: e.target.value }))} placeholder="Confirmed? Link? Handled at check-in?" />
            </Field>
          </div>
        </CardContent>
      </Card>
    )
  }
)

const ExtrasSection = forwardRef<SectionRef, SectionProps>(
  function ExtrasSection({ codex }, ref) {
    const [form, setForm] = useState({
      faq: '',
      testimonials: '',
      sponsors: '',
      anythingElse: '',
    })

    useEffect(() => {
      setForm({
        faq: codex.faq ?? '',
        testimonials: codex.testimonials ?? '',
        sponsors: codex.sponsors ?? '',
        anythingElse: codex.anythingElse ?? '',
      })
    }, [codex])

    useImperativeHandle(ref, () => ({
      getData() { return { valid: true as const, data: pick(form) } }
    }), [form])

    return (
      <Card>
        <CardHeader><CardTitle>Optional Extras</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Field label="FAQ">
              <Textarea rows={8} value={form.faq} onChange={e => setForm(f => ({ ...f, faq: e.target.value }))} placeholder="Questions you always get asked" />
            </Field>
            <Field label="Quotes / testimonials">
              <Textarea rows={6} value={form.testimonials} onChange={e => setForm(f => ({ ...f, testimonials: e.target.value }))} />
            </Field>
            <Field label="Sponsors or partners">
              <Textarea rows={4} value={form.sponsors} onChange={e => setForm(f => ({ ...f, sponsors: e.target.value }))} />
            </Field>
            <Field label="Anything else">
              <Textarea rows={4} value={form.anythingElse} onChange={e => setForm(f => ({ ...f, anythingElse: e.target.value }))} />
            </Field>
          </div>
        </CardContent>
      </Card>
    )
  }
)
