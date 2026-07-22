'use client'

import { api } from '@/lib/api'
import type { Character, GmData } from '@plotrunner/shared'
import { XpSection } from './gm-panel/XpSection'
import { ProgressionSection } from './gm-panel/ProgressionSection'
import { ResourcesSection } from './gm-panel/ResourcesSection'
import { HealthSection } from './gm-panel/HealthSection'
import { ConditionsSection } from './gm-panel/ConditionsSection'

interface Props {
  character: Character
  onRefresh: () => Promise<void>
}

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
