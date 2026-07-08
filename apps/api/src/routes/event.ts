import type { FastifyPluginAsync } from 'fastify'
import { and, eq, desc, count, inArray, asc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { events, eventRegistrations, characters, game, gameMembers } from '../db/schema.js'
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
    '/my-events',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub

      // 1. Get all active game memberships for this user
      const memberships = await db
        .select({
          gameId: game.id,
          gameName: game.name,
          role: gameMembers.role,
        })
        .from(gameMembers)
        .innerJoin(game, eq(game.id, gameMembers.gameId))
        .where(and(eq(gameMembers.userId, userId), eq(gameMembers.status, 'active')))

      if (memberships.length === 0) return reply.send({ games: [] })

      const gameIds = memberships.map(m => m.gameId)
      const roleByGameId = new Map(memberships.map(m => [m.gameId, m.role]))

      // 2. Get all events for those games, sorted by startAt ascending
      const allEvents = await db
        .select({
          id: events.id,
          gameId: events.gameId,
          title: events.title,
          startAt: events.startAt,
          location: events.location,
          status: events.status,
        })
        .from(events)
        .where(inArray(events.gameId, gameIds))
        .orderBy(asc(events.startAt))

      // 3. Get user's registrations across all those events in one query
      const eventIds = allEvents.map(e => e.id)
      const registrations = eventIds.length > 0
        ? await db
            .select({ eventId: eventRegistrations.eventId, status: eventRegistrations.status })
            .from(eventRegistrations)
            .where(
              and(
                inArray(eventRegistrations.eventId, eventIds),
                eq(eventRegistrations.userId, userId),
              ),
            )
        : []

      const regByEventId = new Map(registrations.map(r => [r.eventId, r.status]))

      // 4. Assemble: group events by game, apply role-based status filter
      const gameMap = new Map<string, {
        id: string
        name: string
        role: string
        events: {
          id: string
          title: string
          startAt: string
          location: string | null
          status: string
          userRegistration: { status: string } | null
        }[]
      }>()

      for (const m of memberships) {
        gameMap.set(m.gameId, { id: m.gameId, name: m.gameName, role: m.role, events: [] })
      }

      for (const evt of allEvents) {
        const role = roleByGameId.get(evt.gameId)!
        if (!gmOrOwner(role) && evt.status !== 'published') continue
        const regStatus = regByEventId.get(evt.id)
        gameMap.get(evt.gameId)!.events.push({
          id: evt.id,
          title: evt.title,
          startAt: evt.startAt.toISOString(),
          location: evt.location ?? null,
          status: evt.status,
          userRegistration: regStatus != null ? { status: regStatus } : null,
        })
      }

      const games = Array.from(gameMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))

      return reply.send({ games })
    },
  )

  fastify.get(
    '/admin-events',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub

      const rows = await db
        .select({
          gameId: game.id,
          gameName: game.name,
          gameStatus: game.status,
          eventId: events.id,
          eventTitle: events.title,
          eventStartAt: events.startAt,
          eventEndAt: events.endAt,
          eventStatus: events.status,
        })
        .from(gameMembers)
        .innerJoin(game, eq(game.id, gameMembers.gameId))
        .leftJoin(events, eq(events.gameId, game.id))
        .where(
          and(
            eq(gameMembers.userId, userId),
            eq(gameMembers.status, 'active'),
            inArray(gameMembers.role, ['owner', 'gm']),
          ),
        )
        .orderBy(asc(game.name), asc(events.startAt))

      const gameMap = new Map<string, {
        id: string
        name: string
        isActive: boolean
        events: { id: string; title: string; startAt: string; endAt: string | null; status: string }[]
      }>()

      for (const row of rows) {
        if (!gameMap.has(row.gameId)) {
          gameMap.set(row.gameId, {
            id: row.gameId,
            name: row.gameName,
            isActive: row.gameStatus === 'active',
            events: [],
          })
        }
        if (row.eventId) {
          gameMap.get(row.gameId)!.events.push({
            id: row.eventId,
            title: row.eventTitle!,
            startAt: row.eventStartAt!.toISOString(),
            endAt: row.eventEndAt ? row.eventEndAt.toISOString() : null,
            status: row.eventStatus!,
          })
        }
      }

      return reply.send({ games: Array.from(gameMap.values()) })
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
