'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  gameId: string
  adventureName: string
}

export default function WizardStepDone({ gameId, adventureName }: Props) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <div className="text-5xl">🎉</div>
      <h2 className="text-xl font-semibold">{adventureName} is ready!</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Your Adventure has been created. Head to the edit page to set up your Codex, Rulebook, and more.
      </p>
      <Button asChild data-testid="wizard-go-to-edit">
        <Link href={`/adventures/${gameId}/edit`}>Go to Edit →</Link>
      </Button>
    </div>
  )
}
