'use client'

import { cn } from '@/lib/utils'

interface Props {
  isPublic: boolean
  onChange: (isPublic: boolean) => void
}

export default function WizardStepVisibility({ isPublic, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Who can find this Adventure?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You can change this later in the Adventure Builder.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          data-testid="wizard-visibility-public"
          onClick={() => onChange(true)}
          className={cn(
            'p-4 rounded-lg border text-left transition-colors',
            isPublic
              ? 'border-primary bg-primary/5'
              : 'border-input hover:border-muted-foreground',
          )}
        >
          <div className="font-medium text-sm">Public</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Listed on the Browse page — anyone can discover and join.
          </div>
        </button>
        <button
          type="button"
          data-testid="wizard-visibility-private"
          onClick={() => onChange(false)}
          className={cn(
            'p-4 rounded-lg border text-left transition-colors',
            !isPublic
              ? 'border-primary bg-primary/5'
              : 'border-input hover:border-muted-foreground',
          )}
        >
          <div className="font-medium text-sm">Private</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Hidden from Browse — players can only join with a direct link.
          </div>
        </button>
      </div>
    </div>
  )
}
