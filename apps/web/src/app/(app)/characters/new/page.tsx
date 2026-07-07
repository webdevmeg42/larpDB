'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { setGameId, getGameId } from '@/lib/auth'
import { CharacterForm } from '@/components/character/CharacterForm'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { fieldHasXpCost } from '@/lib/xpCost'
import type { CharacterSchema, Character, SchemaField } from '@larpdb/shared'

interface MyGame {
  id: string
  name: string
  status: string
  role: string
}

// The locked "Character Name" field ID defined in SchemaBuilder
const CHARACTER_NAME_FIELD_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

type Step = 'larp' | 'race' | 'class' | 'form'

export default function NewCharacterPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<Step>('larp')

  const [games, setGames] = useState<MyGame[]>([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [selectedGameId, setSelectedGameId] = useState('')

  const [raceSchemas, setRaceSchemas] = useState<CharacterSchema[]>([])
  const [classSchemas, setClassSchemas] = useState<CharacterSchema[]>([])
  const [schemasLoading, setSchemasLoading] = useState(false)
  const [schemasError, setSchemasError] = useState<string | null>(null)

  const [selectedRace, setSelectedRace] = useState<CharacterSchema | null>(null)
  const [selectedClass, setSelectedClass] = useState<CharacterSchema | null>(null)

  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [nameError, setNameError] = useState(false)

  useEffect(() => {
    if (!user) return
    api.get<MyGame[]>('/my-games')
      .then(all => {
        const available = all.filter(
          g => g.status === 'active' || g.role === 'owner' || g.role === 'gm',
        )
        setGames(available)
        setGamesLoading(false)

        const contextGameId = getGameId()
        const preselected = contextGameId
          ? (available.find(g => g.id === contextGameId) ?? null)
          : available.length === 1
            ? (available[0] ?? null)
            : null

        if (!preselected) return

        setSelectedGameId(preselected.id)
        setSchemasLoading(true)
        setSchemasError(null)
        api.get<CharacterSchema[]>('/character-schemas')
          .then(schemas => {
            setRaceSchemas(schemas.filter(s => s.isActive && s.type === 'race'))
            setClassSchemas(schemas.filter(s => s.isActive && s.type === 'class'))
            setStep('race')
          })
          .catch(() => setSchemasError('Failed to load schemas. Please try again.'))
          .finally(() => setSchemasLoading(false))
      })
      .catch(() => setGamesLoading(false))
  }, [user])

  function handleLarpContinue() {
    if (!selectedGameId) return
    setSchemasLoading(true)
    setSchemasError(null)
    setGameId(selectedGameId)
    api.get<CharacterSchema[]>('/character-schemas')
      .then(schemas => {
        setRaceSchemas(schemas.filter(s => s.isActive && s.type === 'race'))
        setClassSchemas(schemas.filter(s => s.isActive && s.type === 'class'))
        setStep('race')
      })
      .catch(() => setSchemasError('Failed to load schemas. Please try again.'))
      .finally(() => setSchemasLoading(false))
  }

  async function handleSubmit() {
    if (!selectedGameId) return

    const nameVal = typeof formValues[CHARACTER_NAME_FIELD_ID] === 'string'
      ? (formValues[CHARACTER_NAME_FIELD_ID] as string).trim()
      : ''
    if (!nameVal) {
      setSubmitError('Character name is required')
      setNameError(true)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      setGameId(selectedGameId)
      const character = await api.post<Character>('/characters', {
        name: nameVal,
        data: formValues,
        raceSchemaId: selectedRace?.id,
        classSchemaId: selectedClass?.id,
      })
      router.push(`/characters/${character.id}`)
    } catch (err) {
      setSubmitError((err as Error).message ?? 'Failed to create character. Please try again.')
      setSubmitting(false)
    }
  }

  if (!user) return null
  if (gamesLoading) return <div className="p-6 text-muted-foreground">Loading…</div>

  if (games.length === 0) {
    return (
      <div className="p-6 max-w-lg">
        <h1 className="text-2xl font-semibold mb-4">New Character</h1>
        <p className="text-muted-foreground">
          You are not a member of any active LARPs. Join a LARP before creating a character.
        </p>
      </div>
    )
  }

  const stepOrder: Step[] = ['larp', 'race', 'class', 'form']
  const stepLabels: Record<Step, string> = { larp: 'LARP', race: 'Race', class: 'Class', form: 'Character' }
  const currentIndex = stepOrder.indexOf(step)

  const allCombinedFields = [
    ...(selectedRace?.fields ?? []),
    ...(selectedClass?.fields ?? []),
  ]

  function isXpGated(field: SchemaField): boolean {
    return field.type === 'statblock' || fieldHasXpCost(field)
  }

  function isAutoComputed(field: SchemaField): boolean {
    return (
      field.type === 'hitpoints' ||
      field.type === 'attacks' ||
      field.type === 'spells' ||
      (field.type === 'statblock' && (field.stats ?? []).some(s => (s.levelEntries ?? []).length > 0))
    )
  }

  function isGmOnly(field: SchemaField): boolean {
    const lbl = field.label.toLowerCase()
    return (
      (field.type === 'number' && (lbl === 'level' || lbl === 'hit points')) ||
      field.gmOnly === true
    )
  }

  const combinedFields = allCombinedFields.filter(f => !isXpGated(f) && !isGmOnly(f) && !isAutoComputed(f))

  return (
    <div className="p-6 max-w-lg">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        {stepOrder.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`text-sm font-medium ${i === currentIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
              {stepLabels[s]}
            </span>
            {i < stepOrder.length - 1 && <span className="text-muted-foreground text-xs">›</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Select LARP */}
      {step === 'larp' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">New Character</h1>
          <div className="space-y-1.5">
            <Label htmlFor="larp">Select a LARP</Label>
            <select
              id="larp"
              value={selectedGameId}
              onChange={e => setSelectedGameId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {games.length > 1 && <option value="">Choose a LARP…</option>}
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.status !== 'active' ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </div>
          {schemasError && <p className="text-sm text-destructive">{schemasError}</p>}
          <div className="flex gap-2">
            <Button onClick={handleLarpContinue} disabled={!selectedGameId || schemasLoading}>
              {schemasLoading ? 'Loading…' : 'Continue'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/characters')}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Race */}
      {step === 'race' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Select Race</h1>
          {raceSchemas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No races are available for this LARP yet. Ask your GM to set them up.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {raceSchemas.map(schema => (
                <button
                  key={schema.id}
                  type="button"
                  onClick={() => setSelectedRace(schema)}
                  className={`rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedRace?.id === schema.id ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                >
                  <p className="font-medium text-sm">{schema.name}</p>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              data-testid="continue-btn"
              onClick={() => setStep('class')}
              disabled={raceSchemas.length > 0 && !selectedRace}
            >
              Continue
            </Button>
            <Button variant="outline" onClick={() => setStep('larp')}>Back</Button>
          </div>
        </div>
      )}

      {/* Step 3: Select Class */}
      {step === 'class' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Select Class</h1>
          {classSchemas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classes are available for this LARP yet. Ask your GM to set them up.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {classSchemas.map(schema => (
                <button
                  key={schema.id}
                  type="button"
                  onClick={() => setSelectedClass(schema)}
                  className={`rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedClass?.id === schema.id ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                >
                  <p className="font-medium text-sm">{schema.name}</p>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              data-testid="continue-btn"
              onClick={() => setStep('form')}
              disabled={classSchemas.length > 0 && !selectedClass}
            >
              Continue
            </Button>
            <Button variant="outline" onClick={() => setStep('race')}>Back</Button>
          </div>
        </div>
      )}

      {/* Step 4: Character form */}
      {step === 'form' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Create Character</h1>
            {(selectedRace || selectedClass) && (
              <p className="text-sm text-muted-foreground mt-1">
                {[selectedRace?.name, selectedClass?.name].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {combinedFields.length > 0 ? (
            <CharacterForm
              fields={combinedFields}
              values={formValues}
              onChange={values => {
                setFormValues(values)
                if (nameError && typeof values[CHARACTER_NAME_FIELD_ID] === 'string' && (values[CHARACTER_NAME_FIELD_ID] as string).trim()) {
                  setNameError(false)
                  setSubmitError(null)
                }
              }}
              mode="create"
              {...(nameError ? { errorFields: new Set([CHARACTER_NAME_FIELD_ID]) } : {})}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No fields defined for this race/class combination.</p>
          )}
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <div className="flex gap-2">
            <Button data-testid="create-character-btn" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Character'}
            </Button>
            <Button variant="outline" onClick={() => setStep('class')}>Back</Button>
          </div>
        </div>
      )}
    </div>
  )
}
