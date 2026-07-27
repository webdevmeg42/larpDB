import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { apiServer } from '@/lib/api-server'
import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/toast'
import type { AuthUser } from '@/lib/auth'
import type { MyGame } from '@plotrunner/shared'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const cookieStore = await cookies()
    const initialGameId = cookieStore.get('gameId')?.value ?? null

    const [user, games] = await Promise.all([
      apiServer.get<AuthUser>('/auth/me'),
      apiServer.get<MyGame[]>('/my-games'),
    ])

    return (
      <ToastProvider>
        <AppShell initialUser={user} initialGames={games} initialGameId={initialGameId}>
          {children}
        </AppShell>
      </ToastProvider>
    )
  } catch (err) {
    const status = (err as { status?: number }).status
    if (!status || status === 401 || status === 403) redirect('/login')
    throw err
  }
}
