import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/app.js'

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

const SIMPLE_FIELDS = [
  { id: '11111111-1111-1111-1111-111111111111', label: 'Class', type: 'text' as const, required: true, order: 0 },
]

async function setupForStore() {
  const app = buildApp()
  await app.ready()

  // Create owner + game
  const ownerRes = await app.inject({
    method: 'POST',
    url: '/auth/setup',
    payload: { email: 'owner@test.com', password: 'password123', displayName: 'Owner', gameName: 'Test Game' },
  })
  const { token: ownerToken } = ownerRes.json()

  // Create and publish event
  const eventRes = await app.inject({
    method: 'POST',
    url: '/events',
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { title: 'Test Event', startAt: FUTURE_DATE },
  })
  const event = eventRes.json()
  await app.inject({
    method: 'POST',
    url: `/events/${event.id}/publish`,
    headers: { authorization: `Bearer ${ownerToken}` },
  })

  // Create player + character schema + character
  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'player@test.com', password: 'password123', displayName: 'Player One' },
  })
  const playerLoginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'player@test.com', password: 'password123' },
  })
  const { token: playerToken } = playerLoginRes.json()

  const schemaRes = await app.inject({
    method: 'POST',
    url: '/character-schemas',
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { name: 'Hero Sheet', fields: SIMPLE_FIELDS },
  })
  const schema = schemaRes.json()
  await app.inject({
    method: 'POST',
    url: `/character-schemas/${schema.id}/activate`,
    headers: { authorization: `Bearer ${ownerToken}` },
  })

  const charRes = await app.inject({
    method: 'POST',
    url: '/characters',
    headers: { authorization: `Bearer ${playerToken}` },
    payload: {
      name: 'Elara',
      data: { '11111111-1111-1111-1111-111111111111': 'Ranger' },
    },
  })
  const character = charRes.json()

  // Register character for event
  await app.inject({
    method: 'POST',
    url: `/events/${event.id}/register`,
    headers: { authorization: `Bearer ${playerToken}` },
    payload: { characterId: character.id },
  })

  return { app, ownerToken, playerToken, event, character }
}

// ── Store Items ──────────────────────────────────────────────────────────────

describe('POST /store/items', () => {
  it('owner can create a store item', async () => {
    const { app, ownerToken, event } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        eventId: event.id,
        name: 'Luxury Tent',
        price: 500,
        quantityAvailable: 10,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Luxury Tent')
    expect(body.price).toBe(500)
    expect(body.quantityAvailable).toBe(10)
    expect(body.isAvailable).toBe(true)
    await app.close()
  })

  it('player cannot create store items', async () => {
    const { app, playerToken, event } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { eventId: event.id, name: 'Hack', price: 0 },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /store/items', () => {
  it('returns all items', async () => {
    const { app, ownerToken, event } = await setupForStore()

    await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Potion', price: 100 },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    await app.close()
  })

  it('player can list store items', async () => {
    const { app, playerToken } = await setupForStore()

    const res = await app.inject({
      method: 'GET',
      url: '/store/items',
      headers: { authorization: `Bearer ${playerToken}` },
    })

    expect(res.statusCode).toBe(200)
    await app.close()
  })

  it('filters by eventId', async () => {
    const { app, ownerToken, event } = await setupForStore()

    await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Potion', price: 100 },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/store/items?eventId=${event.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    await app.close()
  })
})

describe('PATCH /store/items/:id', () => {
  it('owner can update price and availability', async () => {
    const { app, ownerToken, event } = await setupForStore()

    const createRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Tent', price: 500 },
    })
    const item = createRes.json()

    const res = await app.inject({
      method: 'PATCH',
      url: `/store/items/${item.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { price: 600, isAvailable: false },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().price).toBe(600)
    expect(res.json().isAvailable).toBe(false)
    await app.close()
  })
})

describe('DELETE /store/items/:id', () => {
  it('owner can delete an item with no purchases', async () => {
    const { app, ownerToken, event } = await setupForStore()

    const createRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Tent', price: 500 },
    })
    const item = createRes.json()

    const res = await app.inject({
      method: 'DELETE',
      url: `/store/items/${item.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(204)
    await app.close()
  })

  it('returns 409 when item has purchases', async () => {
    const { app, ownerToken, event, character } = await setupForStore()

    const createRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Tent', price: 500 },
    })
    const item = createRes.json()

    await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { storeItemId: item.id, characterId: character.id },
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/store/items/${item.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })
})

// ── Purchases ────────────────────────────────────────────────────────────────

describe('POST /store/purchases', () => {
  it('owner can record a purchase for a registered character', async () => {
    const { app, ownerToken, event, character } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Tent', price: 500 },
    })
    const item = itemRes.json()

    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { storeItemId: item.id, characterId: character.id, quantity: 1 },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.storeItemId).toBe(item.id)
    expect(body.characterId).toBe(character.id)
    expect(body.unitPrice).toBe(500)
    expect(body.quantity).toBe(1)
    expect(body.currencyName).toBe('monies')
    await app.close()
  })

  it('returns 422 when character is not registered for the event', async () => {
    const { app, ownerToken, event } = await setupForStore()

    // Create a second character NOT registered for the event
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'other@test.com', password: 'password123', displayName: 'Other' },
    })
    const otherLoginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'other@test.com', password: 'password123' },
    })
    const { token: otherToken } = otherLoginRes.json()

    const charRes = await app.inject({
      method: 'POST',
      url: '/characters',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { name: 'Unregistered', data: { '11111111-1111-1111-1111-111111111111': 'Mage' } },
    })
    const unregisteredChar = charRes.json()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Tent', price: 500 },
    })
    const item = itemRes.json()

    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { storeItemId: item.id, characterId: unregisteredChar.id },
    })

    expect(res.statusCode).toBe(422)
    await app.close()
  })

  it('returns 409 when quantity is sold out', async () => {
    const { app, ownerToken, event, character } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Limited Tent', price: 500, quantityAvailable: 1 },
    })
    const item = itemRes.json()

    // First purchase uses up the quantity
    await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { storeItemId: item.id, characterId: character.id, quantity: 1 },
    })

    // Second purchase should fail
    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { storeItemId: item.id, characterId: character.id, quantity: 1 },
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('returns 409 when item is not available', async () => {
    const { app, ownerToken, event, character } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Tent', price: 500, isAvailable: false },
    })
    const item = itemRes.json()

    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { storeItemId: item.id, characterId: character.id },
    })

    expect(res.statusCode).toBe(409)
    await app.close()
  })

  it('player cannot record purchases', async () => {
    const { app, playerToken, character } = await setupForStore()

    const res = await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${playerToken}` },
      payload: { storeItemId: '00000000-0000-0000-0000-000000000000', characterId: character.id },
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

describe('GET /store/purchases', () => {
  it('owner can list purchases with detail fields', async () => {
    const { app, ownerToken, event, character } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Tent', price: 500 },
    })
    const item = itemRes.json()

    await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { storeItemId: item.id, characterId: character.id },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    const rows = res.json()
    expect(rows).toHaveLength(1)
    expect(rows[0].playerName).toBe('Player One')
    expect(rows[0].characterName).toBe('Elara')
    expect(rows[0].eventTitle).toBe('Test Event')
    expect(rows[0].itemName).toBe('Tent')
    await app.close()
  })

  it('filters purchases by eventId', async () => {
    const { app, ownerToken, event, character } = await setupForStore()

    const itemRes = await app.inject({
      method: 'POST',
      url: '/store/items',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { eventId: event.id, name: 'Tent', price: 500 },
    })
    const item = itemRes.json()

    await app.inject({
      method: 'POST',
      url: '/store/purchases',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { storeItemId: item.id, characterId: character.id },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/store/purchases?eventId=${event.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    await app.close()
  })
})
