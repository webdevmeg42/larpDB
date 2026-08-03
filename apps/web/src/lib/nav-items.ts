import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  UserRound,
  UserCircle,
  BookOpen,
  PenSquare,
  ShieldCheck,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles: ('owner' | 'gm' | 'player')[]
  testId?: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',         href: '/dashboard',        icon: LayoutDashboard, roles: ['owner', 'gm', 'player'] },
  { label: 'My Characters',     href: '/characters',       icon: UserRound,       roles: ['owner', 'gm', 'player'] },
  { label: 'My Profile',        href: '/profile',          icon: UserCircle,      roles: ['owner', 'gm', 'player'] },
  { label: 'Events',            href: '/events',           icon: Calendar,        roles: ['owner', 'gm', 'player'] },
  { label: 'Rulebook',          href: '/rulebook',         icon: BookOpen,        roles: ['owner', 'gm', 'player'] },
  { label: 'Admin',             href: '/admin/community',  icon: ShieldCheck,     roles: ['owner', 'gm'] },
  { label: 'Adventure Builder', href: '/adventures',       icon: Settings,        roles: ['owner', 'gm', 'player'], testId: 'nav-adv-builder' },
  { label: 'Users',             href: '/admin/users',      icon: Users,           roles: ['owner'] },
  { label: 'Posts',             href: '/admin/posts',      icon: PenSquare,       roles: ['owner', 'gm'] },
  { label: 'Help',              href: '/help',             icon: HelpCircle,      roles: ['owner', 'gm', 'player'], testId: 'nav-help' },
]

export function getPageTitle(pathname: string): string | null {
  const exact = NAV_ITEMS.find(item => item.href === pathname)
  if (exact) return exact.label
  const prefix = NAV_ITEMS
    .filter(item => pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return prefix?.label ?? null
}
