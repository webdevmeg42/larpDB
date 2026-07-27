'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { PostCard } from '@/components/posts/PostCard'
import type { FeedPost } from '@plotrunner/shared'
import { buttonVariants } from '@/components/ui/button'
import { DiscoverSection } from './DiscoverSection'

interface FeedResponse {
  items: FeedPost[]
  total: number
  limit: number
  offset: number
}

const ADVENTURE_COLORS = [
  'bg-violet-500/20 text-violet-200',
  'bg-emerald-500/20 text-emerald-200',
  'bg-amber-500/20 text-amber-200',
  'bg-sky-500/20 text-sky-200',
  'bg-rose-500/20 text-rose-200',
]

function getAdventureColor(gameId: string): string {
  let hash = 0
  for (let i = 0; i < gameId.length; i++) hash = (hash * 31 + gameId.charCodeAt(i)) & 0xffffffff
  const idx = Math.abs(hash) % ADVENTURE_COLORS.length
  // idx is always a valid index since we mod by length
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return ADVENTURE_COLORS[idx]!
}

interface Props {
  initialFeed: FeedPost[]
  initialTotal: number
  limit: number
  hasSubscriptions: boolean
}

export function DashboardClient({ initialFeed, initialTotal, limit: LIMIT, hasSubscriptions }: Props) {
  const { user } = useAuth()
  const [feed, setFeed] = useState<FeedPost[]>(initialFeed)
  const [total, setTotal] = useState(initialTotal)
  const [offset, setOffset] = useState(0)

  async function loadFeed(nextOffset: number) {
    try {
      const res = await api.get<FeedResponse>(`/feed?limit=${LIMIT}&offset=${nextOffset}`)
      if (nextOffset === 0) {
        setFeed(res.items)
      } else {
        setFeed(prev => [...prev, ...res.items])
      }
      setTotal(res.total)
      setOffset(nextOffset)
    } catch {
      // ignore
    }
  }

  if (!user) return null

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Feed</h1>

      {feed.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          {hasSubscriptions
            ? 'No posts from your followed Adventures yet.'
            : "You're not following any Adventures yet."}
        </p>
      ) : (
        <div className="space-y-4">
          {feed.map(post => (
            <div key={post.id}>
              <div className="mb-2 flex items-center gap-2">
                <Link
                  href={`/adventures/${post.gameSlug}`}
                  className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${getAdventureColor(post.gameId)}`}
                >
                  {post.gameName}
                </Link>
              </div>
              <PostCard post={post} />
            </div>
          ))}

          {feed.length < total && (
            <div className="pt-4 text-center">
              <button
                onClick={() => loadFeed(offset + LIMIT)}
                className={buttonVariants({ variant: 'outline' })}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
      <DiscoverSection />
    </div>
  )
}
