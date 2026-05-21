'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SiteConfig, GameCodex } from '@larpdb/shared'
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
      <EventBasicsSection codex={codex} onSave={saveSection} />
      <GameSettingSection codex={codex} onSave={saveSection} />
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

function EventBasicsSection({ codex, onSave }: SectionProps) {
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
      <CardHeader><CardTitle>Event Basics</CardTitle></CardHeader>
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

function GameSettingSection({ codex, onSave }: SectionProps) {
  const [form, setForm] = useState({
    genre: '',
    tone: '',
    worldLore: '',
    factions: '',
    safetyMechanics: '',
    contentWarnings: '',
  })
  const { saving, saved, handleSubmit } = useSectionSave(onSave)

  useEffect(() => {
    setForm({
      genre: codex.genre ?? '',
      tone: codex.tone ?? '',
      worldLore: codex.worldLore ?? '',
      factions: codex.factions ?? '',
      safetyMechanics: codex.safetyMechanics ?? '',
      contentWarnings: codex.contentWarnings ?? '',
    })
  }, [codex])

  return (
    <Card>
      <CardHeader><CardTitle>The Game &amp; Setting</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={e => void handleSubmit(e, pick(form))}
          className="space-y-4"
        >
          <Field label="Genre">
            <Input value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="high fantasy, post-apocalyptic" />
          </Field>
          <Field label="Tone">
            <Input value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} placeholder="gritty, epic, comedic" />
          </Field>
          <Field label="World / lore overview">
            <Textarea rows={10} value={form.worldLore} onChange={e => setForm(f => ({ ...f, worldLore: e.target.value }))} placeholder="Setting primer for new players" />
          </Field>
          <Field label="Factions, houses, or groups">
            <Textarea rows={6} value={form.factions} onChange={e => setForm(f => ({ ...f, factions: e.target.value }))} placeholder="Name + 1–2 sentence description for each" />
          </Field>
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
            <Input type="date" value={form.registrationOpenDate} onChange={e => setForm(f => ({ ...f, registrationOpenDate: e.target.value }))} />
          </Field>
          <Field label="Registration close date">
            <Input type="date" value={form.registrationCloseDate} onChange={e => setForm(f => ({ ...f, registrationCloseDate: e.target.value }))} />
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
