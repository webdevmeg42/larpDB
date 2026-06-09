'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { SiteConfig } from '@larpdb/shared'
import { api } from '@/lib/api'
import { getGameId, setGameId } from '@/lib/auth'

interface SiteConfigContextValue {
  config: SiteConfig | null
  loading: boolean
  reload: () => void
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  config: null,
  loading: true,
  reload: () => {},
})

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null)
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
        const cfg = await api.get<SiteConfig>('/config')
        setConfig(cfg)
      } catch {
        setConfig(null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [tick])

  const reload = () => setTick(t => t + 1)

  return (
    <SiteConfigContext.Provider value={{ config, loading, reload }}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfigContext() {
  return useContext(SiteConfigContext)
}
