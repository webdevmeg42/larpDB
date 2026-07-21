'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { setGameId } from '@/lib/auth'
import { AdventurePanel } from '@/components/layout/AdventurePanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { formatRelativeDate, type MyGame } from '@plotrunner/shared'

interface Post {
  id: string
  title: string
  createdAt: string
}

interface Props {
  initialGames: MyGame[]
  initialGameId: string | null
  initialPosts: Post[]
}

export function AdminPostsClient({ initialGames, initialGameId, initialPosts }: Props) {
  const router = useRouter()
  const games = initialGames
  const [selectedGameId, setSelectedGameId] = useState<string | null>(initialGameId)
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const game = games.find(g => g.id === selectedGameId)
    if (!game) return
    let cancelled = false
    setLoadingPosts(true)
    api.get<{ posts: Post[]; total: number }>(`/games/${game.slug}/posts`)
      .then(data => { if (!cancelled) setPosts(data.posts) })
      .catch(() => { if (!cancelled) setPosts([]) })
      .finally(() => { if (!cancelled) setLoadingPosts(false) })
    return () => { cancelled = true }
  }, [selectedGameId, games])

  function handleSelect(id: string) {
    setSelectedGameId(id)
    setGameId(id)
  }

  if (games.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">You have no active Adventures to post to.</p>
      </div>
    )
  }

  const selectedGame = games.find(g => g.id === selectedGameId) ?? null

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Posts</h1>

      <div className="flex gap-4 min-h-[400px]">
        <AdventurePanel
          games={games}
          selectedId={selectedGameId}
          onSelect={handleSelect}
        />

        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            {selectedGame ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {selectedGame.name}
                  </span>
                  <Button
                    data-testid="new-post-btn"
                    size="sm"
                    onClick={() => router.push('/admin/posts/new')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Post
                  </Button>
                </div>

                {loadingPosts ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <p className="text-sm text-muted-foreground">No posts yet — write the first one.</p>
                    <Button
                      data-testid="new-post-btn-empty"
                      size="sm"
                      onClick={() => router.push('/admin/posts/new')}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Post
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {posts.map(post => (
                      <li key={post.id} className="px-4 py-3 hover:bg-muted/30">
                        <p className="text-sm font-medium">{post.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(post.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-muted-foreground">Select an Adventure to view posts.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
