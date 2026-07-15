'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AvailabilityStatus } from '@/hooks/useNameAvailability'

interface Props {
  name: string
  onChange: (name: string) => void
  nameError: boolean
  onClearNameError: () => void
  nameStatus: AvailabilityStatus
  baseSlug: string
}

export default function WizardStepName({ name, onChange, nameError, onClearNameError, nameStatus, baseSlug }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Name your Adventure</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This is what players will see when they discover it.
        </p>
      </div>
      <div className="space-y-1">
        <Label>Adventure Name <span className="text-destructive">*</span></Label>
        <Input
          data-testid="wizard-name-input"
          value={name}
          onChange={e => { onChange(e.target.value); onClearNameError() }}
          maxLength={150}
          placeholder="Realm of Shadows"
          className={nameError || nameStatus === 'taken' || nameStatus === 'invalid-slug' ? 'border-destructive' : ''}
          autoFocus
        />
        {nameError && (
          <p data-testid="wizard-name-error" className="text-xs text-destructive">Adventure Name is required</p>
        )}
        {!nameError && baseSlug && nameStatus !== 'taken' && nameStatus !== 'invalid-slug' && (
          <p className="text-xs text-muted-foreground">
            URL: plotrunner.run/adventures/<strong>{baseSlug}</strong>
          </p>
        )}
        {!nameError && (
          <p className={`text-xs ${
            nameStatus === 'available' ? 'text-green-600' :
            nameStatus === 'taken' || nameStatus === 'invalid-slug' ? 'text-destructive' :
            'text-muted-foreground'
          }`}>
            {nameStatus === 'checking' && 'Checking availability…'}
            {nameStatus === 'available' && '✓ Available'}
            {nameStatus === 'taken' && '✗ Already taken'}
            {nameStatus === 'invalid-slug' && 'Name must contain at least one letter or number'}
          </p>
        )}
      </div>
    </div>
  )
}
