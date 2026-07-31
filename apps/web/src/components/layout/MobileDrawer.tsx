'use client'

import { useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, LogOut, ScrollText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/nav-items'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const savedFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      savedFocusRef.current = document.activeElement as HTMLElement
      closeButtonRef.current?.focus()
    } else {
      savedFocusRef.current?.focus()
      savedFocusRef.current = null
    }
  }, [open])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusable.length === 0) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [onClose])

  if (!user) return null

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  return (
    <div className={cn('fixed inset-0 z-50 md:hidden', !open && 'pointer-events-none')}>
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        data-testid="mobile-drawer"
        data-state={open ? 'open' : 'closed'}
        aria-hidden={!open}
        onKeyDown={open ? handleKeyDown : undefined}
        {...(!open ? ({ inert: '' } as Record<string, string>) : {})}
        className={cn(
          'absolute left-0 top-0 h-full w-64 bg-[#080f07] border-r border-border flex flex-col',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border flex-shrink-0">
          <span className="font-heading text-gold">PlotRunner</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1 rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav aria-label="Navigation links" className="flex-1 space-y-1 p-2 overflow-y-auto">
          {visibleItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`mobile-${item.testId ?? `nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}`}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'rounded-r-md border-l-2 border-gold bg-primary/20 text-foreground'
                    : 'rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}

          {user.isSysAdmin && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Platform Admin
              </p>
              <Link
                href="/sys-admin/logs"
                data-testid="nav-audit-logs"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/sys-admin/logs' || pathname.startsWith('/sys-admin/')
                    ? 'rounded-r-md border-l-2 border-gold bg-primary/20 text-foreground'
                    : 'rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <ScrollText className="h-4 w-4" aria-hidden="true" />
                Audit Logs
              </Link>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-2 flex-shrink-0">
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{user.displayName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.isSysAdmin ? 'System Admin' : user.role}
            </p>
          </div>
          <button
            type="button"
            data-testid="nav-sign-out"
            onClick={() => { logout(); onClose() }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
