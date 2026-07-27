import { apiServer } from '@/lib/api-server'
import { RulebookPageClient } from './_components/RulebookPageClient'
import type { MyGame } from '@plotrunner/shared'

export default async function RulebookPage() {
  const games = await apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[])
  return <RulebookPageClient initialGames={games} />
}
