'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileDrawer } from './MobileDrawer'
import { AuthProvider } from '@/providers/AuthProvider'
import { GameProvider } from '@/providers/GameProvider'
import type { AuthUser } from '@/lib/auth'
import type { MyGame } from '@plotrunner/shared'

interface AppShellProps {
  initialUser: AuthUser
  initialGames: MyGame[]
  initialGameId: string | null
  children: React.ReactNode
}

export function AppShell({ initialUser, initialGames, initialGameId, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <AuthProvider initialUser={initialUser}>
      <GameProvider initialGames={initialGames} initialGameId={initialGameId}>
        <div className="flex h-screen overflow-hidden">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-ring focus:shadow-md"
          >
            Skip to main content
          </a>
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
            <main id="main-content" tabIndex={0} className="flex-1 overflow-y-auto">{children}</main>
          </div>
          <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
      </GameProvider>
    </AuthProvider>
  )
}
