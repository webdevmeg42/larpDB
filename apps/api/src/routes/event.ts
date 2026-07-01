import type { FastifyPluginAsync } from 'fastify'
import { and, eq, desc, count } from 'drizzle-orm'
import { db } from '../db/index.js'
import { events, eventRegistrations, characters } from '../db/schema.js'
import { CreateEventInput, UpdateEventInput, RegisterForEventInput, UpdateRegistrationInput } from '@larpdb/shared'
import { gmOrOwner, buildPatch } from '../lib/roles.js'

export const eventRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/events',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      const rows = gmOrOwner(role)
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
      if (!gmOrOwner(role) && event.status !== 'published') return reply.status(404).send({ error: 'Event not found' })
      return reply.send(event)
    },
  )

  fastify.post(
    '/events',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (!gmOrOwner(role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const result = CreateEventInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })

      const [event] = await db.insert(events).values({
        gameId,
        title: result.data.title,
        tagline: result.data.tagline ?? null,
        description: result.data.description ?? null,
        location: result.data.location ?? null,
        keyTimes: result.data.keyTimes ?? null,
        travelNotes: result.data.travelNotes ?? null,
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
      if (!gmOrOwner(role)) return reply.status(403).send({ error: 'GM or owner role required' })

      const { id } = request.params as { id: string }
      const [existing] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!existing) return reply.status(404).send({ error: 'Event not found' })

      const result = UpdateEventInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })

      const { startAt, endAt, ...rest } = result.data
      const [updated] = await db.update(events)
        .set({
          ...buildPatch(rest),
          ...(startAt !== undefined ? { startAt: new Date(startAt) } : {}),
          ...(endAt !== undefined ? { endAt: endAt ? new Date(endAt) : null } : {}),
        })
        .where(and(eq(events.id, id), eq(events.gameId, gameId)))
        .returning()

      return reply.send(updated)
    },
  )

  function registerStatusTransition(
    path: string,
    fromStatus: string,
    toStatus: 'published' | 'archived',
    transitionError: string,
  ) {
    fastify.post(path, { preHandler: [fastify.requireGameContext] }, async (request, reply) => {
      const { gameId, role } = request.gameContext
      if (!gmOrOwner(role)) return reply.status(403).send({ error: 'GM or owner role required' })
      const { id } = request.params as { id: string }
      const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Event not found' })
      if (event.status !== fromStatus) return reply.status(400).send({ error: transitionError })
      const [updated] = await db.update(events).set({ status: toStatus }).where(and(eq(events.id, id), eq(events.gameId, gameId))).returning()
      return reply.send(updated)
    })
  }

  registerStatusTransition('/events/:id/publish', 'draft', 'published', 'Only draft events can be published')
  registerStatusTransition('/events/:id/archive', 'published', 'archived', 'Only published events can be archived')

  fastify.post(
    '/events/:id/register',
    { preHandler: [fastify.requireGameContext] },
    async (request, reply) => {
      const { gameId, userId } = request.gameContext
      const { id } = request.params as { id: string }

      const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.gameId, gameId))).limit(1)
      if (!event) return reply.status(404).send({ error: 'Event not found' })
      if (event.status !== 'published') return reply.status(400).send({ error: 'Event is not open for registration' })

      const [existing] = await db
        .select()
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.userId, userId)))
        .limit(1)

      if (existing && existing.status !== 'cancelled') {
        return reply.status(409).send({ error: 'Already registered for this event' })
      }

      const result = RegisterForEventInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })

      if (result.data.characterId) {
        const [char] = await db
          .select({ id: characters.id })
          .from(characters)
          .where(and(eq(characters.id, result.data.characterId), eq(characters.gameId, gameId), eq(characters.userId, userId)))
          .limit(1)
        if (!char) return reply.status(403).send({ error: 'Character does not belong to you' })
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
        return reply.status(200).send(updated)
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

      const rows = gmOrOwner(role)
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
      const { userId, role } = request.gameContext
      const { id, regId } = request.params as { id: string; regId: string }

      const [reg] = await db
        .select()
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.id, regId), eq(eventRegistrations.eventId, id)))
        .limit(1)
      if (!reg) return reply.status(404).send({ error: 'Registration not found' })

      const result = UpdateRegistrationInput.safeParse(request.body)
      if (!result.success) return reply.status(400).send({ error: 'Invalid input', details: result.error.flatten() })

      const isGmOrOwner = gmOrOwner(role)
      const isOwnReg = reg.userId === userId

      if (!isGmOrOwner && !isOwnReg) return reply.status(403).send({ error: 'Forbidden' })
      if (!isGmOrOwner && result.data.status !== 'cancelled') {
        return reply.status(403).send({ error: 'Players can only cancel their own registration' })
      }

      const [updated] = await db
        .update(eventRegistrations)
        .set({ status: result.data.status })
        .where(and(eq(eventRegistrations.id, regId), eq(eventRegistrations.eventId, id)))
        .returning()

      return reply.send(updated)
    },
  )
}
