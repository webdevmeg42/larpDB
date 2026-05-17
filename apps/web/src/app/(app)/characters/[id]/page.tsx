'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { CharacterSheet } from '@/components/character/CharacterSheet'
import { CharacterForm } from '@/components/character/CharacterForm'
import { XPCostBar } from '@/components/character/XPCostBar'
import { XPConfirmDialog } from '@/components/character/XPConfirmDialog'
import { calculateXpDelta, fieldHasXpCost } from '@/lib/xpCost'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Character, CharacterSchema } from '@larpdb/shared'
import { ArrowLeft } from 'lucide-react'

export default function CharacterDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [character, setCharacter] = useState<Character | null>(null)
  const [schema, setSchema] = useState<CharacterSchema | null>(null)
  const [xpBalance, setXpBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmedCost, setConfirmedCost] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadCharacter = useCallback(async () => {
    if (!id) return
    try {
      const [char, xpData] = await Promise.all([
        api.get<Character>(`/characters/${id}`),
        api.get<{ balance: number; transactions: unknown[] }>(`/characters/${id}/xp`),
      ])
      setCharacter(char)
      setXpBalance(xpData.balance)
      const schemas = await api.get<CharacterSchema[]>('/character-schemas')
      setSchema(schemas.find(s => s.id === char.schemaId) ?? null)
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 404 || status === 403) {
        setNotFound(true)
      } else {
        setError('Failed to load character. Please refresh.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!user || !id) return
    void loadCharacter()
  }, [user, id, loadCharacter])

  if (!user) return null
  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (notFound || !character) {
    return (
      <div className="p-6 text-muted-foreground">
        {error ?? 'Character not found.'}
      </div>
    )
  }

  const fields = schema?.fields ?? []
  const hasXpFields = fields.some(fieldHasXpCost)
  const xpDelta = mode === 'edit' ? calculateXpDelta(fields, character.data, editValues) : 0

  function enterEdit() {
    setEditValues(character!.data)
    setError(null)
    setMode('edit')
  }

  function cancelEdit() {
    setMode('view')
    setEditValues({})
    setError(null)
  }

  async function handleSave() {
    const cost = calculateXpDelta(fields, character!.data, editValues)
    if (cost === 0) {
      setSaving(true)
      try {
        const updated = await api.patch<Character>(`/characters/${id}`, { data: editValues })
        setCharacter(updated)
        setMode('view')
      } catch {
        setError('Failed to save changes. Please try again.')
      } finally {
        setSaving(false)
      }
    } else {
      setConfirmedCost(cost)
      setConfirmOpen(true)
    }
  }

  async function handleConfirm() {
    setSaving(true)
    setConfirmOpen(false)
    setError(null)
    try {
      const updated = await api.patch<Character>(`/characters/${id}`, { data: editValues })
      setCharacter(updated)
      try {
        await api.post(`/characters/${id}/xp/spend`, { amount: confirmedCost, reason: 'Character update' })
        const xpData = await api.get<{ balance: number; transactions: unknown[] }>(`/characters/${id}/xp`)
        setXpBalance(xpData.balance)
      } catch {
        setError('Changes saved but XP could not be deducted. Contact your GM.')
      }
      setMode('view')
    } catch {
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/characters" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{character.name}</h1>
          <p className="text-sm text-muted-foreground">{xpBalance} XP</p>
        </div>
        {character.isActive && <Badge>Active</Badge>}
        {mode === 'view' && (
          <Button onClick={enterEdit} variant="outline" size="sm">
            Edit
          </Button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {mode === 'view' ? (
        <CharacterSheet fields={fields} values={character.data} />
      ) : (
        <CharacterForm
          fields={fields}
          values={editValues}
          onChange={setEditValues}
          mode="edit"
        />
      )}

      {mode === 'edit' && (
        <XPCostBar
          cost={hasXpFields ? xpDelta : 0}
          balance={xpBalance}
          onSave={() => void handleSave()}
          onCancel={cancelEdit}
          saving={saving}
        />
      )}

      <XPConfirmDialog
        open={confirmOpen}
        cost={confirmedCost}
        balance={xpBalance}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
