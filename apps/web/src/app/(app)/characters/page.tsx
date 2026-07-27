import { apiServer } from '@/lib/api-server'
import { CharactersPageClient } from './_components/CharactersPageClient'

type CharacterSummary = { id: string; name: string; totalXp: number; isActive: boolean }
type GameWithCharacters = { id: string; name: string; slug: string; isActive: boolean; characters: CharacterSummary[] }

export default async function CharactersPage() {
  const data = await apiServer.get<{ games: GameWithCharacters[] }>('/my-characters').catch(() => ({ games: [] as GameWithCharacters[] }))
  return <CharactersPageClient initialData={data} />
}
