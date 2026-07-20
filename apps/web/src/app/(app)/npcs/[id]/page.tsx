import { apiServer, fetchOrRedirect } from '@/lib/api-server'
import { NpcDetailClient } from './_components/NpcDetailClient'

interface Npc {
  id: string
  name: string
  description: string | null
  notes: string | null
  portraitUrl: string | null
}

export default async function NpcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const npc = await fetchOrRedirect(() => apiServer.get<Npc>(`/npcs/${id}`))
  return <NpcDetailClient npc={npc} />
}
