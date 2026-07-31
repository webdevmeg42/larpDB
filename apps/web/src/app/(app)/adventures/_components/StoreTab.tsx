'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import type { SiteConfig, StoreItem, PurchaseDetail, AdventureEvent } from '@plotrunner/shared'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'

interface Props {
  config: SiteConfig | null
  reload: () => void
}

export default function StoreTab({ config, reload }: Props) {
  const [currencyName, setCurrencyName] = useState('monies')
  const [savingCurrency, setSavingCurrency] = useState(false)
  const { toast } = useToast()

  const [events, setEvents] = useState<AdventureEvent[]>([])
  const [items, setItems] = useState<StoreItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseDetail[]>([])
  const [filterEventId, setFilterEventId] = useState('')

  useEffect(() => {
    setCurrencyName(config?.currencyName ?? 'monies')
  }, [config])

  useEffect(() => {
    void Promise.all([
      api.get<AdventureEvent[]>('/events'),
      api.get<StoreItem[]>('/store/items'),
      api.get<PurchaseDetail[]>('/store/purchases'),
    ]).then(([evts, itms, purch]) => {
      setEvents(evts)
      setItems(itms)
      setPurchases(purch)
    })
  }, [])

  async function saveCurrency(e: React.FormEvent) {
    e.preventDefault()
    setSavingCurrency(true)
    try {
      await api.patch<SiteConfig>('/config', { currencyName })
      reload()
      toast('Currency saved')
    } finally {
      setSavingCurrency(false)
    }
  }

  async function refreshItems() {
    const updated = await api.get<StoreItem[]>('/store/items')
    setItems(updated)
  }

  async function refreshPurchases() {
    const url = filterEventId ? `/store/purchases?eventId=${filterEventId}` : '/store/purchases'
    const updated = await api.get<PurchaseDetail[]>(url)
    setPurchases(updated)
  }

  useEffect(() => {
    const url = filterEventId ? `/store/purchases?eventId=${filterEventId}` : '/store/purchases'
    void api.get<PurchaseDetail[]>(url).then(setPurchases)
  }, [filterEventId])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Currency</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={e => void saveCurrency(e)} className="flex gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label>Name of in-game currency</Label>
              <Input
                value={currencyName}
                onChange={e => setCurrencyName(e.target.value)}
                placeholder="monies"
              />
            </div>
            <Button type="submit" disabled={savingCurrency}>
              {savingCurrency ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Store Items</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Log</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4 space-y-4">
          <ItemsSection
            events={events}
            items={items}
            currencyName={currencyName}
            onRefresh={refreshItems}
          />
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          <PurchaseLogSection
            events={events}
            purchases={purchases}
            filterEventId={filterEventId}
            onFilterChange={setFilterEventId}
            currencyName={currencyName}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ItemsSectionProps {
  events: AdventureEvent[]
  items: StoreItem[]
  currencyName: string
  onRefresh: () => Promise<void>
}

function ItemsSection({ events, items, currencyName, onRefresh }: ItemsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const itemsByEvent = events
    .map(event => ({ event, items: items.filter(i => i.eventId === event.id) }))
    .filter(({ items: evItems }) => evItems.length > 0)

  function toggleExpanded(eventId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return
    try {
      await api.delete(`/store/items/${id}`)
      await onRefresh()
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete item'))
    }
  }

  async function handleToggleAvailable(item: StoreItem) {
    await api.patch(`/store/items/${item.id}`, { isAvailable: !item.isAvailable })
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAddForm(v => !v)} variant={showAddForm ? 'outline' : 'default'}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          {showAddForm ? 'Cancel' : 'Add item'}
        </Button>
      </div>

      {showAddForm && (
        <ItemForm
          events={events}
          currencyName={currencyName}
          onSave={async () => { await onRefresh(); setShowAddForm(false) }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {itemsByEvent.length === 0 && (
        <p className="text-muted-foreground text-sm">No store items yet.</p>
      )}

      {itemsByEvent.map(({ event, items: evItems }) => (
        <Card key={event.id}>
          <CardHeader className="p-4 pb-2">
            <button
              type="button"
              onClick={() => toggleExpanded(event.id)}
              className="flex items-center gap-2 text-left w-full"
            >
              {expanded.has(event.id)
                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              <span className="font-medium">{event.title}</span>
              <span className="text-xs text-muted-foreground">({evItems.length} items)</span>
            </button>
          </CardHeader>
          {expanded.has(event.id) && (
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Price</th>
                    <th className="text-left p-3 font-medium">Qty</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {evItems.map(item => (
                    editingId === item.id ? (
                      <tr key={item.id} className="border-t">
                        <td colSpan={5} className="p-3">
                          <ItemForm
                            events={events}
                            currencyName={currencyName}
                            item={item}
                            onSave={async () => { await onRefresh(); setEditingId(null) }}
                            onCancel={() => setEditingId(null)}
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id} className="border-t">
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-muted-foreground">{item.price} {currencyName}</td>
                        <td className="p-3 text-muted-foreground">
                          {item.quantityAvailable === null ? 'Unlimited' : item.quantityAvailable}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => void handleToggleAvailable(item)}
                            className="cursor-pointer"
                          >
                            {item.isAvailable
                              ? <Badge>Available</Badge>
                              : <Badge variant="outline">Unavailable</Badge>
                            }
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" aria-label="Edit item" onClick={() => setEditingId(item.id)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive" aria-label="Delete item" onClick={() => void handleDelete(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

interface ItemFormProps {
  events: AdventureEvent[]
  currencyName: string
  item?: StoreItem
  onSave: () => Promise<void>
  onCancel: () => void
}

function ItemForm({ events, currencyName, item, onSave, onCancel }: ItemFormProps) {
  const [form, setForm] = useState({
    eventId: item?.eventId ?? '',
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price ?? 0,
    quantityAvailable: item?.quantityAvailable?.toString() ?? '',
    isAvailable: item?.isAvailable ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        eventId: form.eventId,
        name: form.name,
        description: form.description || null,
        price: form.price,
        quantityAvailable: form.quantityAvailable ? parseInt(form.quantityAvailable, 10) : null,
        isAvailable: form.isAvailable,
      }
      if (item) {
        await api.patch(`/store/items/${item.id}`, payload)
      } else {
        await api.post('/store/items', payload)
      }
      await onSave()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={e => void handleSubmit(e)} className="space-y-3 bg-muted/30 p-4 rounded-md">
      {!item && (
        <div className="space-y-1">
          <Label>Event</Label>
          <select
            value={form.eventId}
            onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select an event…</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Price ({currencyName})</Label>
          <Input
            type="number"
            min={0}
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value, 10) || 0 }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Quantity (blank = unlimited)</Label>
          <Input
            type="number"
            min={1}
            value={form.quantityAvailable}
            onChange={e => setForm(f => ({ ...f, quantityAvailable: e.target.value }))}
            placeholder="Unlimited"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isAvailable"
          checked={form.isAvailable}
          onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))}
        />
        <Label htmlFor="isAvailable">Available for purchase</Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : item ? 'Update' : 'Add item'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

interface PurchaseLogProps {
  events: AdventureEvent[]
  purchases: PurchaseDetail[]
  filterEventId: string
  onFilterChange: (id: string) => void
  currencyName: string
}

function PurchaseLogSection({ events, purchases, filterEventId, onFilterChange, currencyName }: PurchaseLogProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Purchase Log</CardTitle>
        <select
          value={filterEventId}
          onChange={e => onFilterChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All events</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="p-0">
        {purchases.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No purchases yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Player</th>
                <th className="text-left p-3 font-medium">Character</th>
                <th className="text-left p-3 font-medium">Event</th>
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-left p-3 font-medium">Qty</th>
                <th className="text-left p-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground">
                    {new Date(p.purchasedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">{p.playerName}</td>
                  <td className="p-3">{p.characterName}</td>
                  <td className="p-3 text-muted-foreground">{p.eventTitle}</td>
                  <td className="p-3">{p.itemName}</td>
                  <td className="p-3 text-muted-foreground">{p.quantity}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.quantity * p.unitPrice} {currencyName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
