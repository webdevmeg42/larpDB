import { apiServer, fetchOrRedirect } from '@/lib/api-server'
import { CharacterDetailClient, type XpData } from './_components/CharacterDetailClient'
import type { Character, CharacterSchema } from '@plotrunner/shared'

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [[character, xpData], schemas] = await Promise.all([
    Promise.all([
      fetchOrRedirect(() => apiServer.get<Character>(`/characters/${id}`)),
      apiServer.get<XpData>(`/characters/${id}/xp`).catch(() => ({ balance: 0, transactions: [] as XpData['transactions'] })),
    ]),
    apiServer.get<CharacterSchema[]>('/character-schemas').catch(() => [] as CharacterSchema[]),
  ])
  return <CharacterDetailClient character={character} xpData={xpData} schemas={schemas} />
}
