import { cookies } from 'next/headers'
import { apiServer } from '@/lib/api-server'
import { NewCharacterClient } from './_components/NewCharacterClient'
import type { CharacterSchema, MyGame } from '@plotrunner/shared'

export default async function NewCharacterPage() {
  const cookieStore = await cookies()
  const gameIdFromCookie = cookieStore.get('gameId')?.value ?? null

  const [games, schemas] = await Promise.all([
    apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[]),
    apiServer.get<CharacterSchema[]>('/character-schemas').catch(() => [] as CharacterSchema[]),
  ])

  return (
    <NewCharacterClient
      initialGames={games}
      initialSchemas={schemas}
      initialGameId={gameIdFromCookie}
    />
  )
}
