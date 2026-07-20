'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'

interface Npc {
  id: string
  name: string
  description: string | null
  notes: string | null
  portraitUrl: string | null
}

interface Props {
  npc: Npc
}

export function NpcDetailClient({ npc }: Props) {
  const router = useRouter()
  const [name, setName] = useState(npc.name)
  const [description, setDescription] = useState(npc.description ?? '')
  const [notes, setNotes] = useState(npc.notes ?? '')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/npcs/${npc.id}`, {
        name: name.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
      })
      toast('NPC saved')
    } catch (err) {
      setError((err as Error).message ?? 'Failed to save NPC')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${npc.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.delete(`/npcs/${npc.id}`)
      router.push('/admin/community')
    } catch (err) {
      setError((err as Error).message ?? 'Failed to delete NPC')
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/admin/community" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
        ← Back to Admin
      </Link>
      <h1 className="text-2xl font-semibold mb-6">{npc.name}</h1>

      <form onSubmit={e => void handleSave(e)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="npc-name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="npc-name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="npc-description">Description</Label>
          <Textarea
            id="npc-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description visible to players…"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="npc-notes">GM Notes</Label>
          <Textarea
            id="npc-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Private notes for GMs only…"
            rows={4}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3 items-center">
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete NPC'}
          </Button>
        </div>
      </form>
    </div>
  )
}
