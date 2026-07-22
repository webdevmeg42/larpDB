'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSave, Section, Field } from './_shared'

export function XpSection({ characterId, onRefresh }: { characterId: string; onRefresh: () => Promise<void> }) {
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
