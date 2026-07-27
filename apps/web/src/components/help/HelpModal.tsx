'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { findEntryForPath } from '@/lib/help-content'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface HelpModalProps {
  onClose: () => void
}

export function HelpModal({ onClose }: HelpModalProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = user?.role || 'player'
  const entry = findEntryForPath(pathname, role)

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>{entry ? entry.title : 'Help'}</DialogTitle>
      {entry && entry.sections.length > 0 ? (
        entry.sections.map((section, idx) => (
          <div key={`${section.heading}-${idx}`} className="mt-4">
            <h3 className="text-sm font-semibold mb-1">{section.heading}</h3>
            <p className="text-sm text-muted-foreground">{section.body}</p>
          </div>
        ))
      ) : (
        <DialogDescription className="mt-4">No help available for this page.</DialogDescription>
      )}
    </Dialog>
  )
}
