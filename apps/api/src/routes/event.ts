import type { FastifyPluginAsync } from 'fastify'
import { and, eq, desc, count } from 'drizzle-orm'
import { db } from '../db/index.js'
import { events, eventRegistrations } from '../db/schema.js'
import { CreateEventInput, UpdateEventInput, RegisterForEventInput, UpdateRegistrationInput } from '@larpdb/shared'

export const eventRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/events',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      const rows = (role === 'owner' || role === 'gm')
        ? await db.select().from(events).where(eq(events.gameId, gameId)).orderBy(desc(events.startAt))
        : await db.select().from(events).where(and(eq(events.gameId, gameId), eq(events.status, 'published'))).orderBy(desc(events.startAt))
      return reply.send(rows)
    },
  )

  fastify.get(
    '/events/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      const { id } = request.params as { id: string }
      const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Event not found' })
      if (role === 'player' && event.status !== 'published') {
        return reply.status(404).send({ error: 'Event not found' })
      }
      return reply.send(event)
    },
  )

  fastify.post(
    '/events',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner' && role !== 'gm') {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const result = CreateEventInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const [event] = await db.insert(events).values({
        gameId,
        title: result.data.title,
        description: result.data.description ?? null,
        location: result.data.location ?? null,
        startAt: new Date(result.data.startAt),
        endAt: result.data.endAt ? new Date(result.data.endAt) : null,
        maxPlayers: result.data.maxPlayers ?? null,
        status: 'draft',
      }).returning()

      return reply.status(201).send(event)
    },
  )

  fastify.patch(
    '/events/:id',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner' && role !== 'gm') {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Event not found' })

      const result = UpdateEventInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const setData: Record<string, unknown> = {}
      if (result.data.title !== undefined) setData['title'] = result.data.title
      if (result.data.description !== undefined) setData['description'] = result.data.description
      if (result.data.location !== undefined) setData['location'] = result.data.location
      if (result.data.startAt !== undefined) setData['startAt'] = new Date(result.data.startAt)
      if (result.data.endAt !== undefined) setData['endAt'] = result.data.endAt ? new Date(result.data.endAt) : null
      if (result.data.maxPlayers !== undefined) setData['maxPlayers'] = result.data.maxPlayers

      const [updated] = await db
        .update(events)
        .set(setData as Parameters<ReturnType<typeof db.update<typeof events>>['set']>[0])
        .where(and(eq(events.id, id), eq(events.gameId, gameId)))
        .returning()

      return reply.send(updated)
    },
  )

  fastify.post(
    '/events/:id/publish',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner' && role !== 'gm') {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Event not found' })
      if (event.status !== 'draft') {
        return reply.status(400).send({ error: 'Only draft events can be published' })
      }

      const [updated] = await db.update(events).set({ status: 'published' }).where(eq(events.id, id)).returning()
      return reply.send(updated)
    },
  )

  fastify.post(
    '/events/:id/archive',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (role !== 'owner' && role !== 'gm') {
        return reply.status(403).send({ error: 'GM or owner role required' })
      }

      const { id } = request.params as { id: string }
      const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Event not found' })
      if (event.status !== 'published') {
        return reply.status(400).send({ error: 'Only published events can be archived' })
      }

      const [updated] = await db.update(events).set({ status: 'archived' }).where(eq(events.id, id)).returning()
      return reply.send(updated)
    },
  )

  fastify.post(
    '/events/:id/register',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, userId } = request.gameContext
      const { id } = request.params as { id: string }

      const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Event not found' })
      if (event.status !== 'published') {
        return reply.status(400).send({ error: 'Event is not open for registration' })
      }

      const [existing] = await db
        .select()
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.userId, userId)))
        .limit(1)

      if (existing && existing.status !== 'cancelled') {
        return reply.status(409).send({ error: 'Already registered for this event' })
      }

      const result = RegisterForEventInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      let newStatus: 'pending' | 'waitlist' = 'pending'
      if (event.maxPlayers !== null) {
        const countResult = await db
          .select({ value: count() })
          .from(eventRegistrations)
          .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.status, 'confirmed')))
        const confirmedCount = countResult[0]?.value ?? 0
        if (confirmedCount >= event.maxPlayers) newStatus = 'waitlist'
      }

      if (existing) {
        const [updated] = await db
          .update(eventRegistrations)
          .set({ status: newStatus, characterId: result.data.characterId ?? null })
          .where(eq(eventRegistrations.id, existing.id))
          .returning()
        return reply.status(201).send(updated)
      }

      const [registration] = await db.insert(eventRegistrations).values({
        eventId: id,
        userId,
        characterId: result.data.characterId ?? null,
        status: newStatus,
      }).returning()

      return reply.status(201).send(registration)
    },
  )

  fastify.get(
    '/events/:id/registrations',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, userId, role } = request.gameContext
      const { id } = request.params as { id: string }

      const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Event not found' })

      const rows = (role === 'owner' || role === 'gm')
        ? await db.select().from(eventRegistrations).where(eq(eventRegistrations.eventId, id))
        : await db.select().from(eventRegistrations).where(
            and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.userId, userId)),
          )

      return reply.send(rows)
    },
  )

  fastify.patch(
    '/events/:id/registrations/:regId',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, userId, role } = request.gameContext
      const { id, regId } = request.params as { id: string; regId: string }

      const [reg] = await db
        .select()
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.id, regId), eq(eventRegistrations.eventId, id)))
        .limit(1)
      if (!reg) return reply.status(404).send({ error: 'Registration not found' })

      const result = UpdateRegistrationInput.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })
      }

      const isOwnerOrGm = role === 'owner' || role === 'gm'
      const isOwnReg = reg.userId === userId

      if (!isOwnerOrGm && !isOwnReg) {
        return reply.status(403).send({ error: 'Forbidden' })
      }
      if (!isOwnerOrGm && result.data.status !== 'cancelled') {
        return reply.status(403).send({ error: 'Players can only cancel their own registration' })
      }

      const [updated] = await db
        .update(eventRegistrations)
        .set({ status: result.data.status })
        .where(eq(eventRegistrations.id, regId))
        .returning()

      return reply.send(updated)
    },
  )
}
