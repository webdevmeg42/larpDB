'use client'

import * as React from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

function Dialog({ open, onClose, children, className }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'corner-marks border border-t-2 border-t-gold/50',
            'bg-gradient-to-b from-[#0f1d30] to-background p-6',
            'shadow-[0_8px_40px_hsl(0_0%_0%/0.6),0_0_20px_hsl(var(--gold)_/_0.08)]',
            className,
          )}
        >
          <RadixDialog.Close
            className="absolute right-4 top-4 z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </RadixDialog.Close>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return (
    <div className="-mx-6 -mt-6 mb-4 flex items-center gap-2 border-b border-border bg-gold/5 px-5 py-3.5">
      <div className="h-1.5 w-1.5 rotate-45 flex-shrink-0 bg-gold shadow-[0_0_5px_hsl(var(--gold)_/_0.8)]" />
      <RadixDialog.Title className={cn('font-heading text-steel flex-1', className)} {...props} />
      <div className="h-1.5 w-1.5 rotate-45 flex-shrink-0 bg-gold shadow-[0_0_5px_hsl(var(--gold)_/_0.8)]" />
    </div>
  )
}

function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Description>) {
  return <RadixDialog.Description className={cn('text-sm text-muted-foreground mt-1 mb-4', className)} {...props} />
}

export { Dialog, DialogTitle, DialogDescription }
