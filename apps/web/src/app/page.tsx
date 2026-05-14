'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { api } from '@/lib/api'
import type { SiteConfig } from '@larpdb/shared'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      try {
        await api.get<SiteConfig>('/config')
      } catch (err: unknown) {
        if ((err as { status?: number }).status === 404) {
          router.replace('/setup')
          return
        }
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
