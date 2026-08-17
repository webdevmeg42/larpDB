'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGames } from '@/providers/GameProvider'
import { getPageTitle } from '@/lib/nav-items'
import { HelpButton } from '@/components/help/HelpButton'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const pathname = usePathname()
  const { games, currentGame, setCurrentGame } = useGames()
  const [pickerOpen, setPickerOpen] = useState(false)
  const chipRef = useRef<HTMLDivElement>(null)

  const pageTitle = getPageTitle(pathname)

  useEffect(() => {
    if (!pickerOpen) return
    function handle(e: MouseEvent) {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [pickerOpen])

  return (
    <header className="md:hidden flex-shrink-0 border-b border-border bg-sidebar">
      {/* Row 1: hamburger | brand | adventure chip */}
      <div className="flex items-center gap-2 px-3 h-12">
        <button
          type="button"
          data-testid="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="p-1 rounded-sm hover:bg-muted text-muted-foreground"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <span className="font-label text-steel text-[10px] tracking-widest uppercase flex-1">PlotRunner</span>

        <HelpButton compact />

        {currentGame && games.length > 0 && (
          <div ref={chipRef} className="relative">
            <button
              type="button"
              data-testid="adventure-chip"
              onClick={() => setPickerOpen(v => !v)}
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1 text-xs bg-muted border border-border rounded-md px-2 py-1 max-w-[130px] hover:bg-accent transition-colors"
            >
              <span className="truncate">{currentGame.name}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            </button>

            {pickerOpen && (
              <div
                role="listbox"
                aria-label="Select game"
                data-testid="adventure-picker-dropdown"
                className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-md min-w-[160px] py-1"
              >
                {games.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    role="option"
                    aria-selected={g.id === currentGame.id}
                    onClick={() => { setCurrentGame(g.id); setPickerOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted transition-colors',
                      g.id === currentGame.id && 'font-medium',
                    )}
                  >
                    <span className="flex-1 truncate">{g.name}</span>
                    {g.id === currentGame.id && (
                      <Check className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2: current page title (indented past hamburger) */}
      {pageTitle && (
        <div className="px-3 pb-2 pl-[44px] text-xs font-medium text-muted-foreground leading-none">
          {pageTitle}
        </div>
      )}
    </header>
  )
}
