import { apiServer } from '@/lib/api-server'
import { BrowsePageClient } from './_components/BrowsePageClient'
import type { BrowseGame } from './_components/BrowsePageClient'

export default async function BrowsePage() {
  const result = await apiServer
    .get<{ items: BrowseGame[] }>('/games')
    .catch(() => ({ items: [] as BrowseGame[] }))
  return <BrowsePageClient initialGames={result.items} />
}
