'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AdventurePublicShell } from '../_components/AdventurePublicShell'

interface StoreItem {
  id: string
  name: string
  description: string | null
  itemType: string
  priceUsd: number
  xpAmount: number | null
  isAvailable: boolean
  quantityAvailable: number | null
}

interface StoreEvent {
  id: string
  title: string
  startDate: string | null
  items: StoreItem[]
}

interface StoreData {
  events: StoreEvent[]
  gameWideItems: StoreItem[]
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  ticket: '🎟 Ticket',
  xp: '⭐ Bonus XP',
  item: '🧩 In-game Item',
  merchandise: '👕 Merchandise',
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function ItemCard({ item }: { item: StoreItem }) {
  return (
    <div
      className={`flex items-start justify-between rounded-lg border p-4 ${
        !item.isAvailable ? 'opacity-50' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs text-muted-foreground">
            {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
          </span>
        </div>
        <p className="text-sm font-medium">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        )}
        {item.itemType === 'xp' && item.xpAmount != null && (
          <p className="text-xs text-muted-foreground mt-0.5">+{item.xpAmount} XP</p>
        )}
        {item.quantityAvailable !== null && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.quantityAvailable} remaining</p>
        )}
        {!item.isAvailable && (
          <p className="text-xs text-muted-foreground mt-1">Sold out</p>
        )}
      </div>
      <span className="text-sm font-semibold ml-4 flex-shrink-0">
        {formatUsd(item.priceUsd)}
      </span>
    </div>
  )
}

export default function PublicStorePage() {
  const params = useParams<{ slug: string }>()
  const [data, setData] = useState<StoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const storeRes = await fetch(`${API_BASE}/games/${params.slug}/store`)
        if (storeRes.status === 404) { setNotFound(true); return }
        const store = await storeRes.json() as StoreData
        setData(store)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.slug])

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (notFound || !data) return <div className="p-6">Adventure not found.</div>

  const hasItems =
    data.gameWideItems.length > 0 || data.events.some(e => e.items.length > 0)

  return (
    <AdventurePublicShell title="Store" subtitle="Tickets & items">
      {!hasItems ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
          No items are currently available.
        </div>
      ) : (
        <div className="space-y-8">
          {data.gameWideItems.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Available Anytime
              </h2>
              <div className="space-y-2">
                {data.gameWideItems.map(item => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {data.events.map(ev => (
            ev.items.length > 0 && (
              <section key={ev.id}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {ev.title}
                  {ev.startDate && (
                    <span className="ml-2 font-normal normal-case">
                      — {new Date(ev.startDate).toLocaleDateString()}
                    </span>
                  )}
                </h2>
                <div className="space-y-2">
                  {ev.items.map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )
          ))}

          <p className="text-xs text-muted-foreground text-center pt-2">
            <a href="/login" className="hover:underline">Log in</a> to purchase.
          </p>
        </div>
      )}
    </AdventurePublicShell>
  )
}
