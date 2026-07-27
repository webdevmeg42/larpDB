'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GmData } from '@plotrunner/shared'
import { useSave, Section } from './_shared'

export function ProgressionSection({ gm, onSave }: { gm: GmData; onSave: (u: Partial<GmData>) => Promise<void> }) {
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
