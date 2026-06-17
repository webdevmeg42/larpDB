'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface LikeButtonProps {
  postId: string
  initialCount: number
  initialLiked?: boolean
}

export function LikeButton({ postId, initialCount, initialLiked = false }: LikeButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [count, setCount] = useState(initialCount)
  const [liked, setLiked] = useState(initialLiked)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!user) {
      router.push('/login')
      return
    }
    const wasLiked = liked
    setLiked(!wasLiked)
    setCount(c => wasLiked ? c - 1 : c + 1)
    setLoading(true)
    try {
      const res = await api.post<{ likeCount: number; likedByMe: boolean }>(`/posts/${postId}/like`)
      setCount(res.likeCount)
      setLiked(res.likedByMe)
    } catch {
      setLiked(wasLiked)
      setCount(c => wasLiked ? c + 1 : c - 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 text-sm transition-colors',
        liked ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span>👍</span>
      <span>{count}</span>
    </button>
  )
}
