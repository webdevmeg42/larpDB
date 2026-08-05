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

  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    // Imperative: avoids React 18 dev-mode hydration errors from inert as a JSX prop.
    ;(el as HTMLDivElement & { inert: boolean }).inert = !open
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
          'absolute inset-0 bg-black/60 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? 'Navigation menu' : undefined}
        data-testid="mobile-drawer"
        data-state={open ? 'open' : 'closed'}
        aria-hidden={!open}
        onKeyDown={open ? handleKeyDown : undefined}
        className={cn(
          'h-full w-64 bg-sidebar border-r border-border flex flex-col',
          'relative overflow-hidden sidebar-stripe',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative z-10 flex flex-col h-full">
          {/* Badge header */}
          <div className="flex flex-col items-center gap-1.5 border-b border-border px-4 py-3 flex-shrink-0">
            <div className="flex w-full items-center justify-between">
              {/* Hex badge */}
              <div
                className="flex h-9 w-8 items-center justify-center border border-gold/50 shadow-[0_0_10px_hsl(var(--gold)_/_0.4),inset_0_0_6px_hsl(var(--gold)_/_0.05)]"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 15%, 100% 75%, 50% 100%, 0% 75%, 0% 15%)',
                  background: 'linear-gradient(160deg, #14243a 0%, #0b1828 100%)',
                }}
                aria-hidden="true"
              >
                <span
                  className="font-heading text-gold text-xs"
                  style={{ textShadow: '0 0 6px hsl(var(--gold) / 0.7)' }}
                >
                  P
                </span>
              </div>
              <span className="font-label text-steel text-[10px] tracking-widest uppercase flex-1 text-center">
                PlotRunner
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="p-1 rounded-sm hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Sub-rule */}
            <div className="flex w-full items-center gap-1.5 px-1">
              <div className="h-px flex-1 bg-gold/20" />
              <div className="h-1 w-1 rotate-45 bg-gold/40" />
              <div className="h-px flex-1 bg-gold/20" />
            </div>
          </div>

          {/* Nav links */}
          <nav aria-label="Navigation links" className="flex-1 space-y-0.5 p-2 overflow-y-auto">
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
                    'flex items-center gap-3 px-3 py-2 font-label text-xs tracking-wide transition-colors',
                    isActive
                      ? 'rounded-r-sm border-l-2 border-gold bg-steel/5 text-steel'
                      : 'rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rotate-45 flex-shrink-0 transition-shadow',
                      isActive
                        ? 'bg-gold shadow-[0_0_5px_hsl(var(--gold)_/_0.9)]'
                        : 'bg-current',
                    )}
                    aria-hidden="true"
                  />
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}

            {user.isSysAdmin && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="px-3 py-1 font-label text-[10px] tracking-widest uppercase text-muted-foreground">
                  Platform Admin
                </p>
                <Link
                  href="/sys-admin/logs"
                  data-testid="nav-audit-logs"
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 font-label text-xs tracking-wide transition-colors',
                    pathname === '/sys-admin/logs' || pathname.startsWith('/sys-admin/')
                      ? 'rounded-r-sm border-l-2 border-gold bg-steel/5 text-steel'
                      : 'rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rotate-45 flex-shrink-0',
                      pathname.startsWith('/sys-admin/')
                        ? 'bg-gold shadow-[0_0_5px_hsl(var(--gold)_/_0.9)]'
                        : 'bg-current',
                    )}
                    aria-hidden="true"
                  />
                  <ScrollText className="h-4 w-4" aria-hidden="true" />
                  Audit Logs
                </Link>
              </div>
            )}
          </nav>

          {/* User footer */}
          <div className="border-t border-border p-2 flex-shrink-0">
            <div className="px-3 py-2">
              <p className="font-label text-xs tracking-wide text-foreground">{user.displayName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {user.isSysAdmin ? 'System Admin' : user.role}
              </p>
            </div>
            <button
              type="button"
              data-testid="nav-sign-out"
              onClick={() => { logout(); onClose() }}
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2 font-label text-xs tracking-wide text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
