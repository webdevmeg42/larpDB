import { and, eq, inArray, lt } from 'drizzle-orm'
import { db } from './index.js'
import {
  users,
  game,
  gameMembers,
  siteConfig,
  characterSchemas,
  characters,
  xpTransactions,
  events,
  eventRegistrations,
  storeItems,
  purchases,
  npcs,
  plots,
  adventureSubscriptions,
} from './schema.js'

export async function cleanupExpiredGuests() {
  const now = new Date()

  // Find all expired guest users
  const expiredGuests = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isGuest, true), lt(users.guestExpiresAt, now)))

  if (expiredGuests.length === 0) return

  const userIds = expiredGuests.map((u) => u.id)

  await db.transaction(async (tx) => {
    for (const userId of userIds) {
      // 1. Find the guest's game(s) via game_members
      const ownedGames = await tx
        .select({ id: game.id })
        .from(game)
        .innerJoin(gameMembers, and(eq(gameMembers.gameId, game.id), eq(gameMembers.role, 'owner')))
        .where(eq(gameMembers.userId, userId))

      const gameIds = ownedGames.map((g) => g.id)

      if (gameIds.length > 0) {
        // 2. Get event IDs for cascade through event-scoped tables
        const gameEvents = await tx
          .select({ id: events.id })
          .from(events)
          .where(inArray(events.gameId, gameIds))
        const eventIds = gameEvents.map((e) => e.id)

        // 3. Get character IDs
        const gameChars = await tx
          .select({ id: characters.id })
          .from(characters)
          .where(inArray(characters.gameId, gameIds))
        const charIds = gameChars.map((c) => c.id)

        // 4. Delete in FK-safe order
        if (eventIds.length > 0) {
          await tx.delete(purchases).where(inArray(purchases.eventId, eventIds))
          await tx.delete(storeItems).where(inArray(storeItems.eventId, eventIds))
          await tx.delete(eventRegistrations).where(inArray(eventRegistrations.eventId, eventIds))
        }
        if (charIds.length > 0) {
          await tx.delete(xpTransactions).where(inArray(xpTransactions.characterId, charIds))
        }
        await tx.delete(characters).where(inArray(characters.gameId, gameIds))
        await tx.delete(events).where(inArray(events.gameId, gameIds))
        await tx.delete(plots).where(inArray(plots.gameId, gameIds))
        await tx.delete(npcs).where(inArray(npcs.gameId, gameIds))
        await tx.delete(adventureSubscriptions).where(inArray(adventureSubscriptions.gameId, gameIds))
        await tx.delete(gameMembers).where(inArray(gameMembers.gameId, gameIds))
        await tx.delete(siteConfig).where(inArray(siteConfig.gameId, gameIds))
        await tx.delete(characterSchemas).where(inArray(characterSchemas.gameId, gameIds))
        // posts, postLikes, comments cascade from game via DB constraint
        await tx.delete(game).where(inArray(game.id, gameIds))
      }

      // 5. Delete the user (requestLogs.userId has SET NULL, so this is safe)
      await tx.delete(users).where(eq(users.id, userId))
    }
  })
}
