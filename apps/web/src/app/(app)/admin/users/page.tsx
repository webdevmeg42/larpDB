import { apiServer } from '@/lib/api-server'
import { UsersPageClient } from './_components/UsersPageClient'
import type { User } from '@plotrunner/shared'

export default async function UsersPage() {
  const users = await apiServer.get<User[]>('/users').catch(() => [] as User[])
  return <UsersPageClient initialUsers={users} />
}
