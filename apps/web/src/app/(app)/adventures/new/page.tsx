import { apiServer } from '@/lib/api-server'
import { NewAdventureClient } from './_components/NewAdventureClient'
import type { MyGame } from '@plotrunner/shared'

export default async function NewAdventurePage() {
  const games = await apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[])
  return <NewAdventureClient hasAdventures={games.length > 0} />
}
