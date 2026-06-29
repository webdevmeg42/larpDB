'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { LarpPublicShell } from '../_components/LarpPublicShell'

interface StoreItem {
  id: string
  name: string
  description: string | null
  price: number
  isAvailable: boolean
}

interface StoreEvent {
  id: string
  title: string
  startDate: string | null
  items: StoreItem[]
}

interface StoreData {
  currencyName: string
  events: StoreEvent[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function PublicStorePage() {
  const params = useParams<{ slug: string }>()
  const [data, setData] = useState<StoreData | null>(null)
  const [larpName, setLarpName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [publicRes, storeRes] = await Promise.all([
          fetch(`${API_BASE}/games/${params.slug}/public`),
          fetch(`${API_BASE}/games/${params.slug}/store`),
        ])
        if (publicRes.status === 404 || storeRes.status === 404) { setNotFound(true); return }
        const pub = await publicRes.json() as { siteTitle: string }
        const store = await storeRes.json() as StoreData
        setLarpName(pub.siteTitle)
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
  if (notFound || !data) return <div className="p-6">LARP not found.</div>

  const hasItems = data.events.some(e => e.items.length > 0)

  return (
    <LarpPublicShell title="Store" subtitle="Tickets & items">
      {!hasItems ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
          No items are currently available.
        </div>
      ) : (
        <div className="space-y-8">
          {data.events.map(ev => (
            <div key={ev.id}>
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
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      !item.isAvailable ? 'opacity-50' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                      {!item.isAvailable && (
                        <p className="text-xs text-muted-foreground mt-1">Sold out</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold ml-4 flex-shrink-0">
                      {item.price} {data.currencyName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-2">
            <a href="/login" className="hover:underline">Log in</a> to purchase.
          </p>
        </div>
      )}
    </LarpPublicShell>
  )
}
