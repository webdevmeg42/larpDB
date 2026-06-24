'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { api } from '@/lib/api'
import { CharacterSheet } from '@/components/character/CharacterSheet'
import { CharacterForm } from '@/components/character/CharacterForm'
import { XPCostBar } from '@/components/character/XPCostBar'
import { XPConfirmDialog } from '@/components/character/XPConfirmDialog'
import { GmPanel } from '@/components/character/GmPanel'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { calculateXpDelta, fieldHasXpCost } from '@/lib/xpCost'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Character, CharacterSchema } from '@larpdb/shared'

type XpTransaction = { type: 'award' | 'spend'; amount: number }
import { computeCumulativeXp, resolveLevelFromXp } from '@larpdb/shared'
import { ArrowLeft } from 'lucide-react'

export default function CharacterDetailPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { game, config } = useSiteConfig()
  const canEdit = !(game?.status === 'inactive' && user?.role === 'player')
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [character, setCharacter] = useState<Character | null>(null)
  const [schema, setSchema] = useState<CharacterSchema | null>(null)
  const [classSchema, setClassSchema] = useState<CharacterSchema | null>(null)
  const [xpBalance, setXpBalance] = useState(0)
  const [xpSpent, setXpSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmedCost, setConfirmedCost] = useState(0)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCharacter = useCallback(async () => {
    if (!id) return
    try {
      const [char, xpData] = await Promise.all([
        api.get<Character>(`/characters/${id}`),
        api.get<{ balance: number; transactions: XpTransaction[] }>(`/characters/${id}/xp`),
      ])
      setCharacter(char)
      setXpBalance(xpData.balance)
      setXpSpent(xpData.transactions.filter(t => t.type === 'spend').reduce((s, t) => s + t.amount, 0))
      const schemas = await api.get<CharacterSchema[]>('/character-schemas')
      const pinnedRace = schemas.find(s => s.id === char.schemaId)
      // Prefer the latest active version of the same schema type so XP cost config
      // changes take effect for existing characters without needing a re-pin.
      const activeRace = schemas
        .filter(s => s.isActive && s.type === (pinnedRace?.type ?? 'race'))
        .sort((a, b) => b.version - a.version)[0]
      setSchema(activeRace ?? pinnedRace ?? null)
      // Class schemas: multiple distinct schemas share type 'class', so keep the pinned one.
      setClassSchema(char.classSchemaId ? (schemas.find(s => s.id === char.classSchemaId) ?? null) : null)
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

  const fields = [...(schema?.fields ?? []), ...(classSchema?.fields ?? [])]
  const isPlayer = user?.role === 'player'

  const levelField = fields.find(f => f.type === 'number' && f.label.toLowerCase() === 'level')
  const storedLevel = levelField
    ? (character.data as Record<string, unknown>)[levelField.id] as number | undefined
    : undefined

  const codex = config?.codex ?? null

  // Derive level from XP when a leveling system is configured so the display
  // is always accurate even if the stored field lags behind (e.g. auto-level
  // failed silently on a prior award).
  const currentLevel = (codex?.levelingSystem != null)
    ? (resolveLevelFromXp(xpBalance, codex) ?? storedLevel)
    : storedLevel

  const xpToNextLevel = (currentLevel !== undefined && codex)
    ? (() => {
        const next = computeCumulativeXp(currentLevel + 1, codex)
        return next !== null ? Math.max(0, next - xpBalance) : null
      })()
    : null


  function isXpGated(field: typeof fields[number]): boolean {
    return fieldHasXpCost(field)
  }

  function isAutoComputed(field: typeof fields[number]): boolean {
    return (
      field.type === 'hitpoints' ||
      field.type === 'attacks' ||
      field.type === 'spells' ||
      (field.type === 'statblock' && (field.stats ?? []).some(s => (s.levelEntries ?? []).length > 0))
    )
  }

  function isGmOnly(field: typeof fields[number]): boolean {
    return (
      (field.type === 'number' && field.label.toLowerCase() === 'level') ||
      field.gmOnly === true
    )
  }

  const editFields = fields.filter(f => {
    if (isAutoComputed(f)) return false
    if (f.locked) return false
    if (isGmOnly(f)) return false
    if (isXpGated(f) && xpBalance === 0) return false
    return true
  })
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

  async function refreshXp() {
    const xpData = await api.get<{ balance: number; transactions: XpTransaction[] }>(`/characters/${id}/xp`)
    setXpBalance(xpData.balance)
    setXpSpent(xpData.transactions.filter(t => t.type === 'spend').reduce((s, t) => s + t.amount, 0))
  }

  async function handleSave() {
    const cost = calculateXpDelta(fields, character!.data, editValues)
    if (cost > xpBalance) {
      setError(`Not enough XP — this update costs ${cost} XP but you only have ${xpBalance} XP available (${xpSpent} already spent).`)
      return
    }
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
      const updated = await api.patch<Character>(`/characters/${id}`, {
        data: editValues,
        xpSpend: confirmedCost,
      })
      setCharacter(updated)
      await refreshXp()
      setMode('view')
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 400) {
        setError(`Not enough XP — this update costs ${confirmedCost} XP but your balance is insufficient.`)
      } else {
        setError('Failed to save changes. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSetLevel(newLevel: number) {
    if (!levelField) return
    setSaving(true)
    setError(null)
    try {
      const updated = await api.patch<Character>(`/characters/${id}`, {
        data: { ...(character!.data as Record<string, unknown>), [levelField.id]: newLevel },
      })
      setCharacter(updated)
      await refreshXp()
    } catch {
      setError('Failed to update level. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetXp() {
    setResetting(true)
    setResetConfirmOpen(false)
    setError(null)
    try {
      await api.post(`/characters/${id}/xp/reset`, {})
      const updated = await api.get<Character>(`/characters/${id}`)
      setCharacter(updated)
      await refreshXp()
    } catch {
      setError('Failed to reset XP spends. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/characters/${id}`)
      router.push('/characters')
    } catch {
      setError('Failed to delete character. Please try again.')
      setDeleting(false)
      setDeleteConfirmOpen(false)
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
          <div className="flex items-center gap-2 flex-wrap">
            {currentLevel !== undefined && (
              <span className="text-sm font-medium flex items-center gap-1">
                Level {currentLevel}
                {!isPlayer && mode === 'view' && (
                  <>
                    {currentLevel > 1 && (
                      <button
                        onClick={() => void handleSetLevel(currentLevel - 1)}
                        disabled={saving}
                        title="Decrease level"
                        className="ml-1 w-5 h-5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center disabled:opacity-40"
                      >
                        −
                      </button>
                    )}
                    <button
                      onClick={() => void handleSetLevel(currentLevel + 1)}
                      disabled={saving}
                      title="Increase level"
                      className="w-5 h-5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center disabled:opacity-40"
                    >
                      +
                    </button>
                  </>
                )}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {xpBalance} XP available
              {xpSpent > 0 && <> · {xpSpent} spent</>}
              {xpToNextLevel !== null && (
                <> · {xpToNextLevel} to Level {(currentLevel ?? 0) + 1}</>
              )}
            </span>
          </div>
        </div>
        {character.isActive && <Badge>Active</Badge>}
        {mode === 'view' && (
          canEdit ? (
            <div className="flex items-center gap-2">
              <Button onClick={enterEdit} variant="outline" size="sm">
                Edit
              </Button>
              {!isPlayer && (
                <Button
                  onClick={() => setResetConfirmOpen(true)}
                  variant="ghost"
                  size="sm"
                  disabled={resetting}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Reset XP
                </Button>
              )}
              <Button
                onClick={() => setDeleteConfirmOpen(true)}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Delete
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground max-w-[160px] text-right">
              Editing is disabled while this LARP is inactive.
            </span>
          )
        )}
      </div>

      {resetConfirmOpen && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium mb-1">Reset XP spends for <span className="font-semibold">{character.name}</span>?</p>
          <p className="text-xs text-muted-foreground mb-3">
            All spent XP will be refunded to the character&apos;s balance. Progression-based fields (hit points, core stats, attacks, spells) will be reset to their level-appropriate values.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => void handleResetXp()}
              variant="outline"
              size="sm"
              disabled={resetting}
            >
              {resetting ? 'Resetting…' : 'Yes, reset'}
            </Button>
            <Button
              onClick={() => setResetConfirmOpen(false)}
              variant="ghost"
              size="sm"
              disabled={resetting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium mb-3">
            Permanently delete <span className="font-semibold">{character.name}</span>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => void handleDelete()}
              variant="destructive"
              size="sm"
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
            <Button
              onClick={() => setDeleteConfirmOpen(false)}
              variant="outline"
              size="sm"
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {isPlayer ? (
        <>
          {mode === 'view' ? (
            <CharacterSheet fields={fields} values={character.data} />
          ) : (
            <>
              <CharacterForm
                fields={editFields}
                values={editValues}
                onChange={setEditValues}
                mode="edit"
              />
              {xpBalance === 0 && fields.some(isXpGated) && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Stats and skills can be upgraded once your GM awards experience points.
                </p>
              )}
            </>
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
        </>
      ) : (
        <Tabs defaultValue="sheet">
          <TabsList className="mb-4">
            <TabsTrigger value="sheet">Character Sheet</TabsTrigger>
            <TabsTrigger value="gm">GM Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="sheet">
            {mode === 'view' ? (
              <CharacterSheet fields={fields} values={character.data} />
            ) : (
              <>
                <CharacterForm
                  fields={editFields}
                  values={editValues}
                  onChange={setEditValues}
                  mode="edit"
                />
                {xpBalance === 0 && fields.some(isXpGated) && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Stats and skills can be upgraded once your GM awards experience points.
                  </p>
                )}
              </>
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
          </TabsContent>
          <TabsContent value="gm">
            <GmPanel character={character} onRefresh={loadCharacter} />
          </TabsContent>
        </Tabs>
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
