import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  game,
  gameMembers,
  siteConfig,
  characterSchemas,
  events,
  storeItems,
} from '../db/schema.js'

async function fetchPublicGameCodex(slug: string) {
  const [row] = await db
    .select({ codex: siteConfig.codex })
    .from(game)
    .leftJoin(siteConfig, eq(siteConfig.gameId, game.id))
    .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
    .limit(1)
  return row ?? null
}

async function fetchPublicSchemas(slug: string, type: 'race' | 'class') {
  const rows = await db
    .select({
      id: characterSchemas.id,
      name: characterSchemas.name,
      type: characterSchemas.type,
      fields: characterSchemas.fields,
      gameId: characterSchemas.gameId,
    })
    .from(characterSchemas)
    .innerJoin(game, eq(game.id, characterSchemas.gameId))
    .where(
      and(
        eq(game.slug, slug),
        eq(game.isPublic, true),
        eq(game.status, 'active'),
        eq(characterSchemas.isActive, true),
        eq(characterSchemas.type, type),
      ),
    )
  return rows.length > 0 ? rows : null
}

export const gamePublicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/public',
    async (request, reply) => {
      const { slug } = request.params
      const [row] = await db
        .select({
          id: game.id,
          name: game.name,
          slug: game.slug,
          joinMode: game.joinMode,
          status: game.status,
          siteTitle: siteConfig.siteTitle,
          tagline: siteConfig.tagline,
          logoUrl: siteConfig.logoUrl,
          bannerUrl: siteConfig.bannerUrl,
          welcomeMessage: siteConfig.welcomeMessage,
          showDirectory: siteConfig.showDirectory,
          codex: siteConfig.codex,
          colorPrimary: siteConfig.colorPrimary,
          colorSecondary: siteConfig.colorSecondary,
          colorBackground: siteConfig.colorBackground,
          colorText: siteConfig.colorText,
          colorAccent: siteConfig.colorAccent,
          fontHeading: siteConfig.fontHeading,
          fontBody: siteConfig.fontBody,
        })
        .from(game)
        .leftJoin(siteConfig, eq(siteConfig.gameId, game.id))
        .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
        .limit(1)

      if (!row) return reply.status(404).send({ error: 'Adventure not found' })

      const codexData = row.codex ?? {}
      const socialKeys = [
        'socialFacebook', 'socialInstagram', 'socialSnapchat', 'socialTikTok',
        'socialBluesky', 'socialSubstack', 'socialTwitter', 'socialDiscord',
      ] as const

      const socials: Record<string, string | undefined> = {}
      for (const key of socialKeys) {
        const val = (codexData as Record<string, unknown>)[key]
        if (typeof val === 'string' && val) socials[key] = val
      }

      const additionalWebsites = Array.isArray((codexData as Record<string, unknown>).additionalWebsites)
        ? (codexData as Record<string, unknown>).additionalWebsites
        : undefined

      return reply.send({
        id: row.id,
        name: row.name,
        slug: row.slug,
        joinMode: row.joinMode,
        status: row.status,
        siteTitle: row.siteTitle ?? row.name,
        tagline: row.tagline ?? null,
        logoUrl: row.logoUrl ?? null,
        bannerUrl: row.bannerUrl ?? null,
        welcomeMessage: row.welcomeMessage ?? null,
        showDirectory: row.showDirectory ?? false,
        colorPrimary: row.colorPrimary ?? '#6366f1',
        colorSecondary: row.colorSecondary ?? '#a78bfa',
        colorBackground: row.colorBackground ?? '#0f0f1a',
        colorText: row.colorText ?? '#ffffff',
        colorAccent: row.colorAccent ?? '#f59e0b',
        fontHeading: row.fontHeading ?? 'Inter',
        fontBody: row.fontBody ?? 'Inter',
        ...socials,
        ...(additionalWebsites ? { additionalWebsites } : {}),
      })
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/codex',
    async (request, reply) => {
      const row = await fetchPublicGameCodex(request.params.slug)
      if (!row) return reply.status(404).send({ error: 'Adventure not found' })
      return reply.send(row.codex ?? {})
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/rulebook',
    async (request, reply) => {
      const row = await fetchPublicGameCodex(request.params.slug)
      if (!row) return reply.status(404).send({ error: 'Adventure not found' })
      const codex = row.codex ?? {}
      return reply.send({
        rulebookLink: (codex as Record<string, unknown>).rulebookLink ?? null,
        chapters: (codex as Record<string, unknown>).rulebook
          ? ((codex as Record<string, unknown>).rulebook as { chapters: unknown[] }).chapters
          : [],
      })
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/store',
    async (request, reply) => {
      const { slug } = request.params
      const [gameRow] = await db
        .select({ id: game.id, currencyName: siteConfig.currencyName })
        .from(game)
        .leftJoin(siteConfig, eq(siteConfig.gameId, game.id))
        .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
        .limit(1)

      if (!gameRow) return reply.status(404).send({ error: 'Adventure not found' })

      const eventRows = await db
        .select({
          eventId: events.id,
          eventTitle: events.title,
          startAt: events.startAt,
          itemId: storeItems.id,
          itemName: storeItems.name,
          itemDescription: storeItems.description,
          itemPrice: storeItems.price,
          itemIsAvailable: storeItems.isAvailable,
        })
        .from(events)
        .innerJoin(storeItems, eq(storeItems.eventId, events.id))
        .where(and(eq(events.gameId, gameRow.id), eq(events.status, 'published')))
        .orderBy(events.startAt)

      const eventMap = new Map<string, {
        id: string
        title: string
        startDate: string | null
        items: { id: string; name: string; description: string | null; price: number; isAvailable: boolean }[]
      }>()

      for (const r of eventRows) {
        if (!eventMap.has(r.eventId)) {
          eventMap.set(r.eventId, {
            id: r.eventId,
            title: r.eventTitle,
            startDate: r.startAt ? r.startAt.toISOString() : null,
            items: [],
          })
        }
        eventMap.get(r.eventId)!.items.push({
          id: r.itemId,
          name: r.itemName,
          description: r.itemDescription ?? null,
          price: r.itemPrice,
          isAvailable: r.itemIsAvailable,
        })
      }

      return reply.send({
        currencyName: gameRow.currencyName ?? 'monies',
        events: [...eventMap.values()].filter(e => e.items.length > 0),
      })
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/schemas/race',
    async (request, reply) => {
      const schemas = await fetchPublicSchemas(request.params.slug, 'race')
      if (!schemas) return reply.status(404).send({ error: 'Adventure not found' })
      return reply.send(schemas)
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/schemas/class',
    async (request, reply) => {
      const schemas = await fetchPublicSchemas(request.params.slug, 'class')
      if (!schemas) return reply.status(404).send({ error: 'Adventure not found' })
      return reply.send(schemas)
    },
  )

  fastify.get<{ Params: { slug: string } }>(
    '/games/:slug/membership',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { slug } = request.params
      const userId = request.user.sub

      const [gameRow] = await db
        .select({ id: game.id })
        .from(game)
        .where(and(eq(game.slug, slug), eq(game.isPublic, true), eq(game.status, 'active')))
        .limit(1)

      if (!gameRow) return reply.status(404).send({ error: 'Adventure not found' })

      const [member] = await db
        .select({ id: gameMembers.id })
        .from(gameMembers)
        .where(and(
          eq(gameMembers.gameId, gameRow.id),
          eq(gameMembers.userId, userId),
          eq(gameMembers.status, 'active'),
        ))
        .limit(1)

      return reply.send({ isMember: !!member })
    },
  )
}
