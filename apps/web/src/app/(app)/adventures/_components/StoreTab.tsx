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
import type { SiteConfig, StoreItem, PurchaseDetail, AdventureEvent, StoreItemType } from '@plotrunner/shared'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'

interface Props {
  config: SiteConfig | null
  reload: () => void
  stripeConnected: boolean
  onTabChange: (tab: string) => void
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

const ITEM_TYPE_LABELS: Record<StoreItemType, string> = {
  ticket: '🎟 Ticket',
  xp: '⭐ Bonus XP',
  item: '🧩 In-game Item',
  merchandise: '👕 Merchandise',
}

export default function StoreTab({ config: _config, reload: _reload, stripeConnected, onTabChange }: Props) {
  const { toast } = useToast()

  if (!stripeConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground text-lg">🔒 Connect Stripe to unlock your store</p>
        <Button variant="outline" onClick={() => onTabChange('payments')}>
          Go to Payments →
        </Button>
      </div>
    )
  }

  const [events, setEvents] = useState<AdventureEvent[]>([])
  const [items, setItems] = useState<StoreItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseDetail[]>([])
  const [filterEventId, setFilterEventId] = useState('')

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

  async function refreshItems() {
    const updated = await api.get<StoreItem[]>('/store/items')
    setItems(updated)
  }

  useEffect(() => {
    const url = filterEventId ? `/store/purchases?eventId=${filterEventId}` : '/store/purchases'
    void api.get<PurchaseDetail[]>(url).then(setPurchases)
  }, [filterEventId])

  // toast is used by child components indirectly; keep reference to suppress lint
  void toast

  return (
    <div className="space-y-6">
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Store Items</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Log</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4 space-y-4">
          <ItemsSection
            events={events}
            items={items}
            onRefresh={refreshItems}
          />
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          <PurchaseLogSection
            events={events}
            purchases={purchases}
            filterEventId={filterEventId}
            onFilterChange={setFilterEventId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ItemsSectionProps {
  events: AdventureEvent[]
  items: StoreItem[]
  onRefresh: () => Promise<void>
}

function ItemsSection({ events, items, onRefresh }: ItemsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Group items: game-wide (eventId null) and per-event
  const gameWideItems = items.filter(i => i.eventId === null)
  const itemsByEvent = events
    .map(event => ({ event, items: items.filter(i => i.eventId === event.id) }))
    .filter(({ items: evItems }) => evItems.length > 0)

  const hasAnyItems = gameWideItems.length > 0 || itemsByEvent.length > 0

  function toggleExpanded(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
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

  function renderItemRows(groupItems: StoreItem[]) {
    return groupItems.map(item =>
      editingId === item.id ? (
        <tr key={item.id} className="border-t">
          <td colSpan={6} className="p-3">
            <ItemForm
              events={events}
              item={item}
              onSave={async () => { await onRefresh(); setEditingId(null) }}
              onCancel={() => setEditingId(null)}
            />
          </td>
        </tr>
      ) : (
        <tr key={item.id} className="border-t" data-testid="store-item-row">
          <td className="p-3 font-medium">{item.name}</td>
          <td className="p-3">
            <Badge variant="secondary" className="text-xs">
              {ITEM_TYPE_LABELS[item.itemType]}
            </Badge>
          </td>
          <td className="p-3 text-muted-foreground">{formatUsd(item.priceUsd)}</td>
          <td className="p-3 text-muted-foreground">
            {item.quantityAvailable === null ? 'Unlimited' : item.quantityAvailable}
          </td>
          <td className="p-3">
            <button
              type="button"
              data-testid="store-item-availability-badge"
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
              <Button size="sm" variant="outline" aria-label="Edit item" data-testid="store-item-edit-btn" onClick={() => setEditingId(item.id)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="destructive" aria-label="Delete item" data-testid="store-item-delete-btn" onClick={() => void handleDelete(item.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </td>
        </tr>
      )
    )
  }

  function renderGroupTable(groupItems: StoreItem[]) {
    return (
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="text-left p-3 font-medium">Qty</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {renderItemRows(groupItems)}
          </tbody>
        </table>
      </CardContent>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          data-testid="add-store-item-btn"
          onClick={() => setShowAddForm(v => !v)}
          variant={showAddForm ? 'outline' : 'default'}
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          {showAddForm ? 'Cancel' : 'Add item'}
        </Button>
      </div>

      {showAddForm && (
        <ItemForm
          events={events}
          onSave={async () => { await onRefresh(); setShowAddForm(false) }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {!hasAnyItems && (
        <p className="text-muted-foreground text-sm">No store items yet.</p>
      )}

      {gameWideItems.length > 0 && (
        <Card data-testid="store-group-game-wide">
          <CardHeader className="p-4 pb-2">
            <button
              type="button"
              data-testid="store-group-game-wide-toggle"
              onClick={() => toggleExpanded('__game_wide__')}
              className="flex items-center gap-2 text-left w-full"
            >
              {expanded.has('__game_wide__')
                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              <span className="font-medium">Game-wide</span>
              <span className="text-xs text-muted-foreground">({gameWideItems.length} items)</span>
            </button>
          </CardHeader>
          {expanded.has('__game_wide__') && renderGroupTable(gameWideItems)}
        </Card>
      )}

      {itemsByEvent.map(({ event, items: evItems }) => (
        <Card key={event.id}>
          <CardHeader className="p-4 pb-2">
            <button
              type="button"
              data-testid={`store-group-event-${event.id}-toggle`}
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
          {expanded.has(event.id) && renderGroupTable(evItems)}
        </Card>
      ))}
    </div>
  )
}

interface ItemFormProps {
  events: AdventureEvent[]
  item?: StoreItem
  onSave: () => Promise<void>
  onCancel: () => void
}

function ItemForm({ events, item, onSave, onCancel }: ItemFormProps) {
  const isEditing = Boolean(item)

  const [itemType, setItemType] = useState<StoreItemType>(item?.itemType ?? 'item')
  const [scope, setScope] = useState<'event' | 'game'>(
    item ? (item.eventId ? 'event' : 'game') : 'event'
  )
  const [form, setForm] = useState({
    eventId: item?.eventId ?? '',
    name: item?.name ?? '',
    description: item?.description ?? '',
    priceInDollars: item ? (item.priceUsd / 100).toFixed(2) : '0.00',
    xpAmount: item?.xpAmount?.toString() ?? '',
    quantityAvailable: item?.quantityAvailable?.toString() ?? '',
    isAvailable: item?.isAvailable ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When itemType changes to ticket, force event scope
  useEffect(() => {
    if (itemType === 'ticket') setScope('event')
  }, [itemType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const priceUsd = Math.round(parseFloat(form.priceInDollars) * 100)

      if (isEditing && item) {
        const payload: Record<string, unknown> = {
          name: form.name,
          description: form.description || null,
          priceUsd,
          quantityAvailable: form.quantityAvailable ? parseInt(form.quantityAvailable, 10) : null,
          isAvailable: form.isAvailable,
        }
        if (item.itemType === 'xp') {
          payload.xpAmount = form.xpAmount ? parseInt(form.xpAmount, 10) : null
        }
        await api.patch(`/store/items/${item.id}`, payload)
      } else {
        const payload: Record<string, unknown> = {
          itemType,
          name: form.name,
          description: form.description || null,
          priceUsd,
          quantityAvailable: form.quantityAvailable ? parseInt(form.quantityAvailable, 10) : null,
          isAvailable: form.isAvailable,
        }
        if (itemType === 'xp') {
          payload.xpAmount = form.xpAmount ? parseInt(form.xpAmount, 10) : undefined
        }
        if (scope === 'event' || itemType === 'ticket') {
          payload.eventId = form.eventId
        }
        await api.post('/store/items', payload)
      }
      await onSave()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const showXpField = isEditing ? item?.itemType === 'xp' : itemType === 'xp'

  return (
    <form onSubmit={e => void handleSubmit(e)} className="space-y-3 bg-muted/30 p-4 rounded-md">
      {!isEditing && (
        <>
          {/* Item type selector */}
          <div className="space-y-1">
            <Label>Item type</Label>
            <div className="flex flex-wrap gap-2">
              {(['ticket', 'xp', 'item', 'merchandise'] as StoreItemType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  data-testid={`store-item-type-${t}`}
                  onClick={() => setItemType(t)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    itemType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ITEM_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Scope toggle — hidden for tickets (always event-scoped) */}
          {itemType !== 'ticket' && (
            <div className="space-y-1">
              <Label>Scope</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="store-scope-event"
                  onClick={() => setScope('event')}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    scope === 'event'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Linked to event
                </button>
                <button
                  type="button"
                  data-testid="store-scope-game-wide"
                  onClick={() => setScope('game')}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    scope === 'game'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Game-wide
                </button>
              </div>
            </div>
          )}

          {/* Event dropdown — shown when event-scoped */}
          {(scope === 'event' || itemType === 'ticket') && (
            <div className="space-y-1">
              <Label>Event</Label>
              <select
                data-testid="store-event-select"
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
        </>
      )}

      <div className="space-y-1">
        <Label>Name</Label>
        <Input data-testid="store-item-name-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>

      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Price (USD)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              data-testid="store-item-price-input"
              type="number"
              min={0}
              step="0.01"
              className="pl-7"
              value={form.priceInDollars}
              onChange={e => setForm(f => ({ ...f, priceInDollars: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Quantity (blank = unlimited)</Label>
          <Input
            data-testid="store-item-qty-input"
            type="number"
            min={1}
            value={form.quantityAvailable}
            onChange={e => setForm(f => ({ ...f, quantityAvailable: e.target.value }))}
            placeholder="Unlimited"
          />
        </div>
      </div>

      {showXpField && (
        <div className="space-y-1">
          <Label>XP amount <span className="text-destructive">*</span></Label>
          <Input
            data-testid="store-item-xp-input"
            type="number"
            min={1}
            value={form.xpAmount}
            onChange={e => setForm(f => ({ ...f, xpAmount: e.target.value }))}
            required
            placeholder="e.g. 100"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isAvailable"
          data-testid="store-item-available-checkbox"
          checked={form.isAvailable}
          onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))}
        />
        <Label htmlFor="isAvailable">Available for purchase</Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button data-testid="store-item-submit-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : item ? 'Update' : 'Add item'}</Button>
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
}

function PurchaseLogSection({ events, purchases, filterEventId, onFilterChange }: PurchaseLogProps) {
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
                    {formatUsd(p.quantity * p.unitPriceUsd)}
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
