'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getGameId, setGameId } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'

interface Game {
  id: string
  name: string
}

interface GameContextValue {
  games: Game[]
  currentGame: Game | null
  setCurrentGame: (id: string) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setGames([])
      setCurrentGameId(null)
      return
    }
    let cancelled = false
    api
      .get<Array<{ id: string; name: string }>>('/my-games')
      .then(rows => {
        if (cancelled) return
        const list = rows.map(r => ({ id: r.id, name: r.name }))
        setGames(list)
        const saved = getGameId()
        const match = list.find(g => g.id === saved)
        const initial = match ?? list[0] ?? null
        if (initial) {
          setCurrentGameId(initial.id)
          if (!match) setGameId(initial.id)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  const setCurrentGame = useCallback(
    (id: string) => {
      setGameId(id)
      setCurrentGameId(id)
      router.refresh()
    },
    [router],
  )

  const currentGame = games.find(g => g.id === currentGameId) ?? null

  return (
    <GameContext.Provider value={{ games, currentGame, setCurrentGame }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGames(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGames must be used inside GameProvider')
  return ctx
}
