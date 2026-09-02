import { apiServer, fetchOrRedirect } from '@/lib/api-server'
import { HelpPageClient } from './_components/HelpPageClient'
import type { AuthUser } from '@/lib/auth'

export default async function HelpPage() {
  const user = await fetchOrRedirect(() => apiServer.get<AuthUser>('/auth/me'))
  return <HelpPageClient role={user.role} isGuest={user.isGuest ?? false} />
}
