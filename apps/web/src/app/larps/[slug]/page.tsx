'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { PostCard } from '@/components/posts/PostCard'
import { SubscribeButton } from '@/components/SubscribeButton'
import { buttonVariants } from '@/components/ui/button'
import type { Post } from '@larpdb/shared'

interface LarpDetail {
  id: string
  name: string
  description: string | null
  slug: string
  joinMode: 'open' | 'approval'
  status: 'active' | 'inactive'
}

interface PostsResponse {
  items: Post[]
  total: number
  limit: number
  offset: number
}

export default function LarpDetailPage() {
  const params = useParams<{ slug: string }>()
  const [larp, setLarp] = useState<LarpDetail | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [larpData, postsData] = await Promise.all([
          api.get<LarpDetail>(`/games/${params.slug}`),
          api.get<PostsResponse>(`/games/${params.slug}/posts`),
        ])
        setLarp(larpData)
        setPosts(postsData.items)
        setTotal(postsData.total)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.slug])

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (notFound || !larp) return <div className="p-6">LARP not found.</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 border-b pb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl font-bold">{larp.name}</h1>
          <SubscribeButton gameId={larp.id} />
        </div>

        {larp.description && (
          <p className="text-muted-foreground mb-4">{larp.description}</p>
        )}

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {larp.joinMode === 'open' ? 'Open membership' : 'Approval required'}
          </span>
          {larp.joinMode === 'open' && (
            <Link
              href={`/join/${larp.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Join LARP
            </Link>
          )}
        </div>
      </div>

      {/* Posts feed */}
      <h2 className="text-lg font-semibold mb-4">Posts</h2>
      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
          {total > posts.length && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              Showing {posts.length} of {total} posts.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
