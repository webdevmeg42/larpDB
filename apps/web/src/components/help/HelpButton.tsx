'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HelpModal } from './HelpModal'

interface HelpButtonProps {
  compact?: boolean
}

export function HelpButton({ compact = false }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        data-testid="help-button"
        onClick={() => setOpen(true)}
        aria-label="Open help"
        className={cn(
          'rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
          compact
            ? 'p-1'
            : 'flex w-full items-center gap-3 px-3 py-2 text-sm font-medium',
        )}
      >
        <HelpCircle className="h-4 w-4" />
        {!compact && <span>Help</span>}
      </button>
      {open && <HelpModal onClose={() => setOpen(false)} />}
    </>
  )
}
