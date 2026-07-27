import { apiServer, fetchOrRedirect } from '@/lib/api-server'
import { EventDetailClient } from './_components/EventDetailClient'
import type { AdventureEvent, EventRegistration, Character } from '@plotrunner/shared'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [event, registrations, characters] = await Promise.all([
    fetchOrRedirect(() => apiServer.get<AdventureEvent>(`/events/${id}`)),
    apiServer.get<EventRegistration[]>(`/events/${id}/registrations`).catch(() => [] as EventRegistration[]),
    apiServer.get<Character[]>('/characters').catch(() => [] as Character[]),
  ])
  const myReg = registrations[0] ?? null
  return <EventDetailClient event={event} myReg={myReg} characters={characters} />
}
