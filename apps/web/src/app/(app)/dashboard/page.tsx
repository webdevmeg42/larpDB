import { apiServer } from '@/lib/api-server'
import { DashboardClient } from './_components/DashboardClient'
import type { FeedPost } from '@plotrunner/shared'

interface FeedResponse { items: FeedPost[]; total: number; limit: number; offset: number }
const LIMIT = 20

export default async function DashboardPage() {
  const [data, subs] = await Promise.all([
    apiServer.get<FeedResponse>(`/feed?limit=${LIMIT}&offset=0`).catch(() => ({ items: [] as FeedPost[], total: 0, limit: LIMIT, offset: 0 })),
    apiServer.get<{ gameId: string }[]>('/subscriptions').catch(() => [] as { gameId: string }[]),
  ])
  return <DashboardClient initialFeed={data.items} initialTotal={data.total} limit={LIMIT} hasSubscriptions={subs.length > 0} />
}
