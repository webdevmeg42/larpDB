import { cookies } from 'next/headers'
import { apiServer } from '@/lib/api-server'
import { AdminPostsClient } from './_components/AdminPostsClient'
import type { MyGame } from '@plotrunner/shared'

interface Post { id: string; title: string; createdAt: string }

export default async function PostsPage() {
  const cookieStore = await cookies()
  const gameIdFromCookie = cookieStore.get('gameId')?.value ?? null

  const games = await apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[])
  const eligible = games.filter(g => g.status === 'active' && (g.role === 'owner' || g.role === 'gm'))

  const initialGame = eligible.find(g => g.id === gameIdFromCookie) ?? eligible[0] ?? null
  const initialPosts = initialGame
    ? await apiServer.get<{ posts: Post[]; total: number }>(`/games/${initialGame.slug}/posts`).catch(() => ({ posts: [] as Post[], total: 0 }))
    : { posts: [], total: 0 }

  return (
    <AdminPostsClient
      initialGames={eligible}
      initialGameId={initialGame?.id ?? null}
      initialPosts={initialPosts.posts}
    />
  )
}
