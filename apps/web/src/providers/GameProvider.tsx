'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { setGameId } from '@/lib/auth'
import { setCurrentGameAction } from '@/app/actions/game'
import type { MyGame } from '@plotrunner/shared'

interface GameContextValue {
  games: MyGame[]
  currentGame: MyGame | null
  setCurrentGame: (id: string) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({
  initialGames,
  initialGameId,
  children,
}: {
  initialGames: MyGame[]
  initialGameId: string | null
  children: React.ReactNode
}) {
  const [games] = useState<MyGame[]>(initialGames)
  const [currentGameId, setCurrentGameId] = useState<string | null>(
    () => {
      const valid = initialGames.find(g => g.id === initialGameId)
      return valid?.id ?? initialGames[0]?.id ?? null
    },
  )

  const setCurrentGame = useCallback((id: string) => {
    setCurrentGameId(id)
    setGameId(id)
    void setCurrentGameAction(id)
  }, [])

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
