'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  tagline: string
  onTaglineChange: (v: string) => void
}

export default function WizardStepBranding({ tagline, onTaglineChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Add some branding</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Optional — you can fill these in later from the Adventure Builder.
        </p>
      </div>
      <div className="space-y-1">
        <Label>Tagline</Label>
        <Input
          data-testid="wizard-tagline-input"
          value={tagline}
          onChange={e => onTaglineChange(e.target.value)}
          maxLength={150}
          placeholder="A world of magic and mystery"
        />
        <p className="text-xs text-muted-foreground text-right">{tagline.length} / 150</p>
      </div>
    </div>
  )
}
