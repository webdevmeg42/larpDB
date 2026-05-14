export interface JwtPayload {
  sub: string
  email: string
  role: 'owner' | 'gm' | 'player'
  displayName: string
  iat: number
  exp: number
}

const TOKEN_KEY = 'larpdb_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload)) as JwtPayload
  } catch {
    return null
  }
}

export function getCurrentUser(): JwtPayload | null {
  const token = getToken()
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload) return null
  if (payload.exp * 1000 < Date.now()) {
    clearToken()
    return null
  }
  return payload
}
