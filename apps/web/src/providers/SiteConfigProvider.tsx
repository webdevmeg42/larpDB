'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { SiteConfig, Game } from '@plotrunner/shared'
import { api } from '@/lib/api'
import { getGameId, setGameId, clearGameId } from '@/lib/auth'

interface SiteConfigContextValue {
  config: SiteConfig | null
  game: Game | null
  loading: boolean
  reload: () => void
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  config: null,
  game: null,
  loading: true,
  reload: () => {},
})

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        if (!getGameId()) {
          const games = await api.get<Array<{ id: string }>>('/games')
          const first = games[0]
          if (first) setGameId(first.id)
        }

        let configFailed = false
        try {
          const cfg = await api.get<SiteConfig>('/config')
          setConfig(cfg)
        } catch {
          setConfig(null)
          configFailed = true
        }

        try {
          const gameRow = await api.get<Game>('/game')
          setGame(gameRow)
        } catch {
          setGame(null)
          // Only clear gameId if config also failed — game truly doesn't exist
          if (configFailed) clearGameId()
        }
      } catch {
        // network failure resolving game ID — config/game stay null
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [tick])

  const reload = () => setTick(t => t + 1)

  return (
    <SiteConfigContext.Provider value={{ config, game, loading, reload }}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfigContext() {
  return useContext(SiteConfigContext)
}
