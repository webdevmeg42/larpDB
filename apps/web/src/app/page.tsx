'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getGameId, setGameId } from '@/lib/auth'
import { api } from '@/lib/api'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      try {
        if (!getGameId()) {
          const games = await api.get<Array<{ id: string }>>('/games')
          const first = games[0]
          if (!first) {
            router.replace('/setup')
            return
          }
          setGameId(first.id)
        }
      } catch {
        // API unreachable — proceed anyway
      }
      const user = getCurrentUser()
      if (!user) {
        router.replace('/login')
      } else {
        router.replace('/dashboard')
      }
    }
    void redirect()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  )
}
