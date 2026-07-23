'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { findEntryForPath } from '@/lib/help-content'
import { Dialog, DialogTitle } from '@/components/ui/dialog'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = user?.role ?? 'player'
  const entry = findEntryForPath(pathname, role)

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{entry ? entry.title : 'Help'}</DialogTitle>
      {entry ? (
        entry.sections.map(section => (
          <div key={section.heading} className="mt-4">
            <h3 className="text-sm font-semibold mb-1">{section.heading}</h3>
            <p className="text-sm text-muted-foreground">{section.body}</p>
          </div>
        ))
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No help available for this page.</p>
      )}
    </Dialog>
  )
}
