'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { LogOut, ScrollText } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/nav-items'
import { HelpButton } from '@/components/help/HelpButton'

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  return (
    <div className="hidden md:flex h-full w-56 flex-col border-r border-border bg-sidebar relative overflow-hidden sidebar-stripe">
      <div className="relative z-10 flex flex-col h-full">

        {/* Badge header */}
        <div className="flex flex-col items-center gap-1.5 border-b border-border px-4 py-3">
          {/* Hex badge */}
          <div
            className="flex h-11 w-10 items-center justify-center border border-gold/50 shadow-[0_0_14px_hsl(var(--gold)_/_0.4),0_0_40px_hsl(var(--gold)_/_0.1),inset_0_0_10px_hsl(var(--gold)_/_0.05)]"
            style={{
              clipPath: 'polygon(50% 0%, 100% 15%, 100% 75%, 50% 100%, 0% 75%, 0% 15%)',
              background: 'linear-gradient(160deg, #14243a 0%, #0b1828 100%)',
            }}
            aria-hidden="true"
          >
            <span
              className="font-heading text-gold text-sm"
              style={{ textShadow: '0 0 6px hsl(var(--gold) / 0.7)' }}
            >
              P
            </span>
          </div>
          {/* Wordmark */}
          <span className="font-label text-steel text-[10px] tracking-widest uppercase">PlotRunner</span>
          {/* Sub-rule */}
          <div className="flex w-full items-center gap-1.5 px-1">
            <div className="h-px flex-1 bg-gold/20" />
            <div className="h-1 w-1 rotate-45 bg-gold/40" />
            <div className="h-px flex-1 bg-gold/20" />
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex-1 space-y-0.5 p-2">
          {visibleItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId ?? `nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
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

        {/* Footer */}
        <div className="border-t border-border p-2">
          <div className="px-3 py-2">
            <p className="font-label text-xs tracking-wide text-foreground">{user.displayName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {user.isSysAdmin ? 'System Admin' : user.role}
            </p>
          </div>
          <HelpButton />
          <button
            onClick={logout}
            data-testid="nav-sign-out"
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 font-label text-xs tracking-wide text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>

      </div>
    </div>
  )
}
