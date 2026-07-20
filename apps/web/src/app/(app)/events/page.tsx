import { apiServer } from '@/lib/api-server'
import { EventsPageClient } from './_components/EventsPageClient'

type EventWithReg = {
  id: string; title: string; startAt: string; endAt: string | null
  location: string | null; status: 'draft' | 'published' | 'archived'
  userRegistration: { status: 'confirmed' | 'pending' | 'waitlist' | 'cancelled' } | null
}
type GameWithEvents = { id: string; name: string; role: 'owner' | 'gm' | 'player'; events: EventWithReg[] }

export default async function EventsPage() {
  const data = await apiServer.get<{ games: GameWithEvents[] }>('/my-events').catch(() => ({ games: [] as GameWithEvents[] }))
  return <EventsPageClient initialData={data} />
}
