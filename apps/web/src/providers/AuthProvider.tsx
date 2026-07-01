'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { JwtPayload } from '@/lib/auth'
import { getCurrentUser, setToken, clearToken, decodeToken } from '@/lib/auth'
import { api } from '@/lib/api'
import type { LoginInput, RegisterInput } from '@larpdb/shared'

interface AuthContextValue {
  user: JwtPayload | null
  loading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  updateToken: (token: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setUser(getCurrentUser())
    setLoading(false)
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const res = await api.post<{ token: string }>('/auth/login', input)
    setToken(res.token)
    const payload = decodeToken(res.token)
    setUser(payload)
    router.push('/dashboard')
  }, [router])

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.post<{ token: string }>('/auth/register', input)
    setToken(res.token)
    const payload = decodeToken(res.token)
    setUser(payload)
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    router.push('/login')
  }, [router])

  const updateToken = useCallback((token: string) => {
    const payload = decodeToken(token)
    if (!payload) {
      clearToken()
      setUser(null)
      return
    }
    setToken(token)
    setUser(payload)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
