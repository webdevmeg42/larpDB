'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

type SaveState = 'idle' | 'saving' | 'error'

export function useSave() {
  const [state, setState] = useState<SaveState>('idle')
  const { toast } = useToast()
  async function save(fn: () => Promise<void>) {
    setState('saving')
    try {
      await fn()
      setState('idle')
      toast('Changes saved')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }
  const label = state === 'saving' ? 'Saving…' : state === 'error' ? 'Error — try again' : 'Save'
  return { save, label, saving: state === 'saving' }
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}
