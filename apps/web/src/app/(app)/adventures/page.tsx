import { apiServer } from '@/lib/api-server'
import { AdventuresPageClient } from './_components/AdventuresPageClient'
import type { MyGame } from '@plotrunner/shared'

export default async function AdventureBuilderPage() {
  const games = await apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[])
  return <AdventuresPageClient initialGames={games} />
}
