import { cookies } from 'next/headers'
import { apiServer } from '@/lib/api-server'
import { NewNpcClient } from './_components/NewNpcClient'
import type { MyGame } from '@plotrunner/shared'

export default async function NewNpcPage() {
  const cookieStore = await cookies()
  const gameIdFromCookie = cookieStore.get('gameId')?.value ?? null

  const games = await apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[])
  const currentGame = games.find(g => g.id === gameIdFromCookie) ?? games[0] ?? null

  return (
    <NewNpcClient
      selectedGameId={currentGame?.id ?? null}
      gameName={currentGame?.name ?? null}
    />
  )
}
