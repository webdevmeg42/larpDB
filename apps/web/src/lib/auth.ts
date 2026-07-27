export interface AuthUser {
  id: string
  email: string
  role: 'owner' | 'gm' | 'player'
  displayName: string
  isSysAdmin?: boolean
}

const GAME_KEY = 'plotrunner_game_id'

export function getGameId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(GAME_KEY)
}

export function setGameId(id: string): void {
  localStorage.setItem(GAME_KEY, id)
}

export function clearGameId(): void {
  localStorage.removeItem(GAME_KEY)
}
