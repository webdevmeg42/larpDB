import { cookies } from 'next/headers'
import { apiServer } from '@/lib/api-server'
import { NewEventClient } from './_components/NewEventClient'
import type { MyGame } from '@plotrunner/shared'

export default async function NewEventPage() {
  const cookieStore = await cookies()
  const gameIdFromCookie = cookieStore.get('gameId')?.value ?? null

  const games = await apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[])
  const currentGame = games.find(g => g.id === gameIdFromCookie) ?? games[0] ?? null

  return (
    <NewEventClient
      selectedGameId={currentGame?.id ?? null}
      gameName={currentGame?.name ?? null}
    />
  )
}
