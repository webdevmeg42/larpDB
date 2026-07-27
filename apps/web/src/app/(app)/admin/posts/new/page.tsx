import { cookies } from 'next/headers'
import { apiServer } from '@/lib/api-server'
import { NewPostClient } from './_components/NewPostClient'
import type { MyGame } from '@plotrunner/shared'

interface Draft {
  id: string
  title: string
  body: string
  gameId: string
  gameName: string
  mediaType: 'photo' | 'video' | null
  mediaUrls: string[] | null
  updatedAt: string
}

export default async function NewPostPage() {
  const cookieStore = await cookies()
  const gameIdFromCookie = cookieStore.get('gameId')?.value ?? null

  const [games, drafts] = await Promise.all([
    apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[]),
    apiServer.get<Draft[]>('/posts/drafts').catch(() => [] as Draft[]),
  ])

  const eligible = games.filter(g => g.status === 'active' && (g.role === 'owner' || g.role === 'gm'))
  const fromCookie = eligible.find(g => g.id === gameIdFromCookie) ?? null
  const initialGame = fromCookie ?? (eligible.length === 1 ? eligible[0] : null)

  return (
    <NewPostClient
      initialGames={eligible}
      initialGameId={initialGame?.id ?? null}
      initialDrafts={drafts}
    />
  )
}
