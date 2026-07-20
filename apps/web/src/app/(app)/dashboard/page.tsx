import { apiServer } from '@/lib/api-server'
import { DashboardClient } from './_components/DashboardClient'
import type { FeedPost } from '@plotrunner/shared'

interface FeedResponse { items: FeedPost[]; total: number; limit: number; offset: number }
const LIMIT = 20

export default async function DashboardPage() {
  const data = await apiServer.get<FeedResponse>(`/feed?limit=${LIMIT}&offset=0`).catch(() => ({ items: [] as FeedPost[], total: 0, limit: LIMIT, offset: 0 }))
  return <DashboardClient initialFeed={data.items} initialTotal={data.total} limit={LIMIT} />
}
