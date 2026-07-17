'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthUser } from '@/lib/auth'
import { clearGameId } from '@/lib/auth'
import { api } from '@/lib/api'
import type { LoginInput, RegisterInput } from '@plotrunner/shared'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    api.get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const { user } = await api.post<{ user: AuthUser }>('/auth/login', input)
    setUser(user)
    router.push('/dashboard')
  }, [router])

  const register = useCallback(async (input: RegisterInput) => {
    const { user } = await api.post<{ user: AuthUser }>('/auth/register', input)
    setUser(user)
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(() => {
    api.post('/auth/logout', {}).catch(() => {})
    setUser(null)
    clearGameId()
  }, [])

  const refreshUser = useCallback(async () => {
    const user = await api.get<AuthUser>('/auth/me')
    setUser(user)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
