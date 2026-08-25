import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'
import { registerAndLogin, createActiveGame } from './utils.js'

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

const SIMPLE_FIELDS = [
  { id: '11111111-1111-1111-1111-111111111111', label: 'Class', type: 'text' as const, required: true, order: 0 },
]

async function createAndLogin(email = 'owner@test.com') {
  const app = buildApp()
  await app.ready()
  const { token } = await registerAndLogin(app, email)
  const { gameId } = await createActiveGame(app, token)
  return { app, token, gameId }
}

async function setupForStore() {
  const { app, token: ownerToken, gameId } = await createAndLogin()

  // Create and publish event
  const eventRes = await app.inject({
    method: 'POST',
    url: '/events',
    headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    payload: { title: 'Test Event', startAt: FUTURE_DATE },
  })
  const event = eventRes.json()
  await app.inject({
    method: 'POST',
    url: `/events/${event.id}/publish`,
    headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
  })

  // Register player and join game
  const { token: playerToken } = await registerAndLogin(app, 'player@test.com', 'password123', 'Player One')

  await app.inject({
    method: 'POST',
    url: '/subscriptions',
    headers: { authorization: `Bearer ${playerToken}` },
    payload: { gameId },
  })

  // Create and activate character schema
  const schemaRes = await app.inject({
    method: 'POST',
    url: '/character-schemas',
    headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
  })
  const schema = schemaRes.json()
  await app.inject({
    method: 'POST',
    url: `/character-schemas/${schema.id}/activate`,
    headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
  })

  // Player creates character
  const charRes = await app.inject({
    method: 'POST',
    url: '/characters',
    headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    payload: {
      name: 'Elara',
      raceSchemaId: schema.id,
      data: { '11111111-1111-1111-1111-111111111111': 'Ranger' },
    },
  })
  const character = charRes.json()

  // Register character for event
  await app.inject({
    method: 'POST',
    url: `/events/${event.id}/register`,
    headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    payload: { characterId: character.id },
  })

  return { app, ownerToken, playerToken, event, character, gameId }
}

// ── Store Items ──────────────────────────────────────────────────────────────

describe('POST /store/items', () => {
  it('owner can create a store item', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: {
        eventId: event.id,
        itemType: 'merchandise',
        name: 'Luxury Tent',
        priceUsd: 500,
        quantityAvailable: 10,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Luxury Tent')
    expect(body.priceUsd).toBe(500)
    expect(body.quantityAvailable).toBe(10)
    expect(body.isAvailable).toBe(true)
    await app.close()
  })

  it('owner can create a game-wide item with no eventId', async () => {
    const { app, ownerToken, gameId } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: {
        itemType: 'merchandise',
        name: 'Game T-Shirt',
        priceUsd: 2000,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Game T-Shirt')
    expect(body.eventId).toBeNull()
    expect(body.gameId).toBe(gameId)
    await app.close()
  })

  it('owner can create an XP item with xpAmount', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: {
        eventId: event.id,
        itemType: 'xp',
        name: 'Bonus XP Pack',
        priceUsd: 1000,
        xpAmount: 100,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.xpAmount).toBe(100)
    expect(body.itemType).toBe('xp')
    await app.close()
  })

  it('returns 400 when XP item is missing xpAmount', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: {
        eventId: event.id,
        itemType: 'xp',
        name: 'Broken XP Item',
        priceUsd: 500,
      },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('returns 400 when ticket item is missing eventId', async () => {
    const { app, ownerToken, gameId } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: {
        itemType: 'ticket',
        name: 'Weekend Ticket',
        priceUsd: 5000,
      },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('player cannot create store items', async () => {
    const { app, playerToken, event, gameId } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Hack', priceUsd: 0 },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /store/items', () => {
  it('returns all items', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Potion', priceUsd: 100 },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    await app.close()
  })

  it('player can list store items', async () => {
    const { app, playerToken, gameId } = await setupForStore()

    const res = await app.inject({
      method: 'GET',
      url: '/store/items',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    await app.close()
  })

  it('filters by eventId and excludes items from other events', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    // Event-specific item
    await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Potion', priceUsd: 100 },
    })

    // Game-wide item (no eventId)
    await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { itemType: 'merchandise', name: 'Game T-Shirt', priceUsd: 2000 },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/store/items?eventId=${event.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    const items = res.json() as Array<Record<string, unknown>>
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Potion')
    await app.close()
  })

  it('GET without filter returns both event-specific and game-wide items', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    // Event-specific item
    await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Potion', priceUsd: 100 },
    })

    // Game-wide item (no eventId)
    await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { itemType: 'merchandise', name: 'Game T-Shirt', priceUsd: 2000 },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(2)
    await app.close()
  })
})

describe('PATCH /store/items/:id', () => {
  it('owner can update priceUsd and availability', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    const createRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Tent', priceUsd: 500 },
    })
    const item = createRes.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/store/items/${item.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { priceUsd: 600, isAvailable: false },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().priceUsd).toBe(600)
    expect(res.json().isAvailable).toBe(false)
    await app.close()
  })
})

describe('DELETE /store/items/:id', () => {
  it('owner can delete an item with no purchases', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    const createRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Tent', priceUsd: 500 },
    })
    const item = createRes.json()

    const res = await app.inject({
      method: 'DELETE',
      url: `/store/items/${item.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(204)
    await app.close()
  })

  it('returns 409 when item has purchases', async () => {
    const { app, ownerToken, event, character, gameId } = await setupForStore()

    const createRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Tent', priceUsd: 500 },
    })
    const item = createRes.json()

    await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: item.id, characterId: character.id },
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/store/items/${item.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })
})

// ── Purchases ────────────────────────────────────────────────────────────────

describe('POST /store/purchases', () => {
  it('owner can record a purchase for a registered character', async () => {
    const { app, ownerToken, event, character, gameId } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Tent', priceUsd: 500 },
    })
    const item = itemRes.json()

    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: item.id, characterId: character.id, quantity: 1 },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.storeItemId).toBe(item.id)
    expect(body.characterId).toBe(character.id)
    expect(body.unitPriceUsd).toBe(500)
    expect(body.quantity).toBe(1)
    await app.close()
  })

  it('returns 422 when character is not registered for the event', async () => {
    const { app, ownerToken, event, gameId } = await setupForStore()

    // Create a second user, join game, create character (NOT registered for the event)
    const { token: otherToken } = await registerAndLogin(app, 'other@test.com', 'password123', 'Other')

    await app.inject({
      method: 'POST',
      url: '/subscriptions',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { gameId },
    })

    const schemaRes = await app.inject({
      method: 'GET',
      url: '/character-schemas',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })
    const activeSchemaId = schemaRes.json()[0]?.id

    const charRes = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${otherToken}`, 'x-game-id': gameId },
      payload: { name: 'Unregistered', raceSchemaId: activeSchemaId, data: { '11111111-1111-1111-1111-111111111111': 'Mage' } },
    })
    const unregisteredChar = charRes.json()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Tent', priceUsd: 500 },
    })
    const item = itemRes.json()

    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: item.id, characterId: unregisteredChar.id },
    })

    expect(res.statusCode).toBe(422)
    await app.close()
  })

  it('returns 409 when quantity is sold out', async () => {
    const { app, ownerToken, event, character, gameId } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Limited Tent', priceUsd: 500, quantityAvailable: 1 },
    })
    const item = itemRes.json()

    // First purchase uses up the quantity
    await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: item.id, characterId: character.id, quantity: 1 },
    })

    // Second purchase should fail
    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: item.id, characterId: character.id, quantity: 1 },
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 409 when item is not available', async () => {
    const { app, ownerToken, event, character, gameId } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Tent', priceUsd: 500, isAvailable: false },
    })
    const item = itemRes.json()

    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: item.id, characterId: character.id },
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('player cannot record purchases', async () => {
    const { app, playerToken, character, gameId } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${playerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: '00000000-0000-0000-0000-000000000000', characterId: character.id },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /store/purchases', () => {
  it('owner can list purchases with detail fields', async () => {
    const { app, ownerToken, event, character, gameId } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Tent', priceUsd: 500 },
    })
    const item = itemRes.json()

    await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: item.id, characterId: character.id },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { total: number; items: Array<Record<string, unknown>> }
    expect(body.total).toBe(1)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]!.playerName).toBe('Player One')
    expect(body.items[0]!.characterName).toBe('Elara')
    expect(body.items[0]!.eventTitle).toBe('Test Event')
    expect(body.items[0]!.itemName).toBe('Tent')
    expect(body.items[0]!.unitPriceUsd).toBe(500)
    await app.close()
  })

  it('filters purchases by eventId', async () => {
    const { app, ownerToken, event, character, gameId } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { eventId: event.id, itemType: 'merchandise', name: 'Tent', priceUsd: 500 },
    })
    const item = itemRes.json()

    await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
      payload: { storeItemId: item.id, characterId: character.id },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/store/purchases?eventId=${event.id}`,
      headers: { authorization: `Bearer ${ownerToken}`, 'x-game-id': gameId },
    })

    expect(res.statusCode).toBe(200)
    const filtered = res.json() as { total: number; items: Array<Record<string, unknown>> }
    expect(filtered.items).toHaveLength(1)
    await app.close()
  })
})
