export interface StoreItem {
  id: string
  eventId: string
  name: string
  description: string | null
  price: number
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
  unitPrice: number
  currencyName: string
  purchasedAt: string
}

export interface PurchaseDetail extends Purchase {
  playerName: string
  characterName: string
  eventTitle: string
  itemName: string
}
