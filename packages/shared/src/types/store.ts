import type { StoreItemType } from '../schemas/store.js'

export interface StoreItem {
  id: string
  gameId: string
  eventId: string | null
  itemType: StoreItemType
  name: string
  description: string | null
  priceUsd: number   // stored in cents (e.g. 1500 = $15.00)
  xpAmount: number | null
  quantityAvailable: number | null
  isAvailable: boolean
  createdAt: string
}

export interface Purchase {
  id: string
  storeItemId: string
  eventId: string
  userId: string
  characterId: string
  quantity: number
  unitPriceUsd: number   // in cents
  purchasedAt: string
}

export interface PurchaseDetail extends Purchase {
  playerName: string
  characterName: string
  eventTitle: string
  itemName: string
}
