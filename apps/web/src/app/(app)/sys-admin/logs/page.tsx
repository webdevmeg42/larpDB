import { apiServer } from '@/lib/api-server'
import { LogsPageClient } from './_components/LogsPageClient'

type LogEntry = {
  id: string
  userId: string | null
  userDisplayName: string | null
  userEmail: string | null
  method: string
  url: string
  statusCode: number
  durationMs: number
  createdAt: string
}

type AdminUser = {
  id: string
  displayName: string
  email: string
  isSysAdmin: boolean
  createdAt: string
}

type LogsResponse = {
  total: number
  items: LogEntry[]
  limit: number
  offset: number
}

const LIMIT = 100

export default async function LogsPage() {
  const [users, logsData] = await Promise.all([
    apiServer.get<AdminUser[]>('/admin/users').catch(() => [] as AdminUser[]),
    apiServer.get<LogsResponse>(`/admin/logs?limit=${LIMIT}&offset=0`).catch(() => ({ items: [] as LogEntry[], total: 0, limit: LIMIT, offset: 0 })),
  ])
  return <LogsPageClient initialUsers={users} initialLogs={logsData.items} initialTotal={logsData.total} />
}
