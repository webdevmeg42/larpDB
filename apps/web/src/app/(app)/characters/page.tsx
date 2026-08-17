import { apiServer } from '@/lib/api-server'
import { CharactersPageClient } from './_components/CharactersPageClient'
import type { AuthUser } from '@/lib/auth'
import type { AdminCharacter } from '@plotrunner/shared'
import { AdminCharactersPageClient } from './_components/AdminCharactersPageClient'

type CharacterSummary = { id: string; name: string; totalXp: number; isActive: boolean }
type GameWithCharacters = { id: string; name: string; slug: string; isActive: boolean; characters: CharacterSummary[] }

export default async function CharactersPage() {
  const user = await apiServer.get<AuthUser>('/auth/me').catch(() => null)

  if (user?.isSysAdmin) {
    const chars = await apiServer.get<AdminCharacter[]>('/admin/characters').catch(() => [] as AdminCharacter[])
    return <AdminCharactersPageClient initialCharacters={chars} />
  }

  const data = await apiServer.get<{ games: GameWithCharacters[] }>('/my-characters').catch(() => ({ games: [] as GameWithCharacters[] }))
  return <CharactersPageClient initialData={data} />
}
