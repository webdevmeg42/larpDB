'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Swords,
  Map,
  LogOut,
  UserRound,
  UserCircle,
  BookOpen,
  PenSquare,
  ShieldCheck,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles: ('owner' | 'gm' | 'player')[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'gm', 'player'] },
  { label: 'My Characters', href: '/characters', icon: UserRound, roles: ['owner', 'gm', 'player'] },
  { label: 'My Profile', href: '/profile', icon: UserCircle, roles: ['owner', 'gm', 'player'] },
  { label: 'Events', href: '/events', icon: Calendar, roles: ['owner', 'gm', 'player'] },
  { label: 'Rulebook', href: '/rulebook', icon: BookOpen, roles: ['owner', 'gm', 'player'] },
  { label: 'Admin', href: '/admin/community', icon: ShieldCheck, roles: ['owner', 'gm'] },
  { label: 'LARP Builder', href: '/larps', icon: Settings, roles: ['owner'] },
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['owner'] },
  { label: 'NPCs', href: '/npcs', icon: Swords, roles: ['owner', 'gm'] },
  { label: 'Plots', href: '/plots', icon: Map, roles: ['owner', 'gm'] },
  { label: 'New Post', href: '/admin/posts/new', icon: PenSquare, roles: ['owner', 'gm'] },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  return (
    <div className="flex h-full w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold">larpDB</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
        {user.isSysAdmin && (
          <div className="mt-2 pt-2 border-t">
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Platform Admin
            </p>
            <Link
              href="/sys-admin/logs"
              data-testid="nav-audit-logs"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/sys-admin/logs' || pathname.startsWith('/sys-admin/')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <ScrollText className="h-4 w-4" />
              Audit Logs
            </Link>
          </div>
        )}
      </nav>
      <div className="border-t p-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{user.displayName}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.isSysAdmin ? 'System Admin' : user.role}</p>
        </div>
        <button
          onClick={logout}
          data-testid="nav-sign-out"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
