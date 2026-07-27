'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage, cn } from '@/lib/utils'
import { setGameId } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useNameAvailability } from '@/hooks/useNameAvailability'
import type { Game, SiteConfig } from '@plotrunner/shared'
import WizardStepName from './WizardStepName'
import WizardStepVisibility from './WizardStepVisibility'
import WizardStepBranding from './WizardStepBranding'
import WizardStepDone from './WizardStepDone'

type Step = 1 | 2 | 3 | 4

const STEPS = [
  { n: 1 as Step, label: 'Name' },
  { n: 2 as Step, label: 'Visibility' },
  { n: 3 as Step, label: 'Branding' },
  { n: 4 as Step, label: 'Done' },
]

export default function NewAdventureWizard() {
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [tagline, setTagline] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdGameId, setCreatedGameId] = useState<string | null>(null)

  // Called once here; results passed as props to WizardStepName to avoid duplicate API calls
  const { status: nameStatus, baseSlug } = useNameAvailability(name)

  async function submit(skipBranding: boolean) {
    setSaving(true)
    setError(null)
    try {
      const newGame = await api.post<Game>('/games', {
        name: name.trim(),
        isPublic,
      })
      setGameId(newGame.id)
      if (!skipBranding && tagline.trim()) {
        try {
          await api.patch<SiteConfig>('/config', {
            siteTitle: name.trim(),
            tagline: tagline.trim(),
          })
        } catch {
          // non-blocking — game exists, proceed
        }
      }
      setCreatedGameId(newGame.id)
      setStep(4)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create Adventure'))
    } finally {
      setSaving(false)
    }
  }

  function handleContinue() {
    if (step === 1) {
      if (!name.trim()) { setNameError(true); return }
      if (nameStatus !== 'available') return
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      void submit(false)
    }
  }

  function handleBack() {
    if (step > 1 && step < 4) setStep((step - 1) as Step)
  }

  const continueDisabled =
    saving ||
    (step === 1 && (nameStatus !== 'available' || !name.trim()))

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-8">Build New Adventure</h1>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-44 shrink-0">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Setup
          </div>
          <div className="flex flex-col gap-1">
            {STEPS.map(s => {
              const isActive = s.n === step
              const isDone = s.n < step
              return (
                <div
                  key={s.n}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm',
                    isActive ? 'bg-primary/10 border-l-2 border-primary font-medium text-primary' : 'text-muted-foreground',
                  )}
                >
                  <span className={cn('text-xs font-bold w-4 text-center', isActive ? 'text-primary' : isDone ? 'text-green-600' : '')}>
                    {isDone ? '✓' : s.n}
                  </span>
                  <span>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 flex flex-col gap-6">
          {step === 1 && (
            <WizardStepName
              name={name}
              onChange={setName}
              nameError={nameError}
              onClearNameError={() => setNameError(false)}
              nameStatus={nameStatus}
              baseSlug={baseSlug}
            />
          )}
          {step === 2 && (
            <WizardStepVisibility isPublic={isPublic} onChange={setIsPublic} />
          )}
          {step === 3 && (
            <WizardStepBranding tagline={tagline} onTaglineChange={setTagline} />
          )}
          {step === 4 && createdGameId && (
            <WizardStepDone gameId={createdGameId} adventureName={name} />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {step < 4 && (
            <div className="flex items-center gap-3 mt-auto pt-4">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={saving}>
                  Back
                </Button>
              )}
              {step === 3 && (
                <Button variant="ghost" onClick={() => void submit(true)} disabled={saving}>
                  Skip
                </Button>
              )}
              <Button
                data-testid="wizard-continue-btn"
                onClick={handleContinue}
                disabled={continueDisabled}
              >
                {saving ? 'Creating…' : step === 3 ? 'Create Adventure' : 'Continue →'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
