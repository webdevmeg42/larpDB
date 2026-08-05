import { apiServer } from '@/lib/api-server'
import { AdventuresPageClient } from './_components/AdventuresPageClient'
import { AdminAdventuresPageClient } from './_components/AdminAdventuresPageClient'
import type { MyGame, AdminGame } from '@plotrunner/shared'
import type { AuthUser } from '@/lib/auth'

export default async function AdventureBuilderPage() {
  const user = await apiServer.get<AuthUser>('/auth/me').catch(() => null)

  if (user?.isSysAdmin) {
    const games = await apiServer.get<AdminGame[]>('/admin/games').catch(() => [] as AdminGame[])
    return <AdminAdventuresPageClient initialGames={games} />
  }

  const games = await apiServer.get<MyGame[]>('/my-games').catch(() => [] as MyGame[])
  return <AdventuresPageClient initialGames={games} />
}
