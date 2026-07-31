'use client'

import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { findEntryForPath } from '@/lib/help-content'

interface HelpModalProps {
  onClose: () => void
}

export function HelpModal({ onClose }: HelpModalProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = user?.role || 'player'
  const entry = findEntryForPath(pathname, role)

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="help-dialog-title" className="text-lg font-semibold">
          {entry ? entry.title : 'Help'}
        </h2>
        {entry && entry.sections.length > 0 ? (
          entry.sections.map((section, idx) => (
            <div key={`${section.heading}-${idx}`} className="mt-4">
              <h3 className="text-sm font-semibold mb-1">{section.heading}</h3>
              <p className="text-sm text-muted-foreground">{section.body}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground mt-4">No help available for this page.</p>
        )}
      </div>
    </>
  )
}
