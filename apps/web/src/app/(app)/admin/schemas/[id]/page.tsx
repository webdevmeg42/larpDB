import { apiServer, fetchOrRedirect } from '@/lib/api-server'
import { SchemaBuilderClient } from './_components/SchemaBuilderClient'
import type { CharacterSchema } from '@plotrunner/shared'

export default async function SchemaBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const schema = await fetchOrRedirect(() => apiServer.get<CharacterSchema>(`/character-schemas/${id}`))
  return <SchemaBuilderClient initialSchema={schema} />
}
