'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import type { ApiError } from '@plotrunner/shared'

interface SubscribeButtonProps {
  gameId: string
  initialSubscribed?: boolean
  onToggle?: (subscribed: boolean) => void
}

export function SubscribeButton({ gameId, initialSubscribed = false, onToggle }: SubscribeButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!user) {
      router.push('/login')
      return
    }
    setLoading(true)
    try {
      if (subscribed) {
        await api.delete(`/subscriptions/${gameId}`)
        setSubscribed(false)
        onToggle?.(false)
      } else {
        try {
          await api.post('/subscriptions', { gameId })
          setSubscribed(true)
          onToggle?.(true)
        } catch (err) {
          if ((err as ApiError).status === 409) {
            setSubscribed(true)
            onToggle?.(true)
          } else {
            throw err
          }
        }
      }
    } catch {
      // ignore network errors silently
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant={subscribed ? 'secondary' : 'default'}
      disabled={loading}
      onClick={toggle}
      className="flex-shrink-0"
    >
      {subscribed ? '✓ Following' : 'Follow'}
    </Button>
  )
}
