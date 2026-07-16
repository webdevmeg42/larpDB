'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileDrawer } from './MobileDrawer'
import { GameProvider } from '@/providers/GameProvider'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <GameProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </GameProvider>
  )
}
