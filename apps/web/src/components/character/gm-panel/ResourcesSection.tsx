'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GmData } from '@plotrunner/shared'
import { useSave, Section, Field } from './_shared'

export function ResourcesSection({ gm, onSave }: { gm: GmData; onSave: (u: Partial<GmData>) => Promise<void> }) {
  const [currency, setCurrency] = useState(gm.currency?.toString() ?? '')
  const [consumables, setConsumables] = useState(gm.consumables ?? [])
  const [inventory, setInventory] = useState(gm.inventory ?? [])
  const [crafting, setCrafting] = useState(gm.craftingMaterials ?? [])
  const { save, label, saving } = useSave()

  useEffect(() => {
    setCurrency(gm.currency?.toString() ?? '')
    setConsumables(gm.consumables ?? [])
    setInventory(gm.inventory ?? [])
    setCrafting(gm.craftingMaterials ?? [])
  }, [gm])

  return (
    <Section title="Resources">
      <Field label="Currency / gold">
        <Input
          type="number"
          min={0}
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          placeholder="0"
          className="w-36"
        />
      </Field>

      <div className="space-y-2">
        <Label className="text-sm">Consumables</Label>
        {consumables.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={c.name}
              onChange={e => setConsumables(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              placeholder="Healing Potion"
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              value={c.count}
              onChange={e => setConsumables(prev => prev.map((x, j) => j === i ? { ...x, count: parseInt(e.target.value, 10) || 0 } : x))}
              className="w-20"
            />
            <button type="button" onClick={() => setConsumables(p => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setConsumables(p => [...p, { name: '', count: 1 }])}>
          + Add consumable
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Inventory items</Label>
        {inventory.map((item, i) => (
          <div key={i} className="rounded border p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <Input
                value={item.name}
                onChange={e => setInventory(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                placeholder="Item name"
                className="flex-1"
              />
              <button type="button" onClick={() => setInventory(p => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
            </div>
            <Input
              value={item.description ?? ''}
              onChange={e => setInventory(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
              placeholder="Description (optional)"
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setInventory(p => [...p, { name: '' }])}>
          + Add item
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Crafting materials</Label>
        {crafting.map((m, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={m.name}
              onChange={e => setCrafting(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              placeholder="Iron ore"
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              value={m.count}
              onChange={e => setCrafting(prev => prev.map((x, j) => j === i ? { ...x, count: parseInt(e.target.value, 10) || 0 } : x))}
              className="w-20"
            />
            <button type="button" onClick={() => setCrafting(p => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setCrafting(p => [...p, { name: '', count: 1 }])}>
          + Add material
        </Button>
      </div>

      <Button
        size="sm"
        disabled={saving}
        onClick={() => void save(() => {
          const patch: Partial<GmData> = {
            consumables: consumables.filter(c => c.name.trim()),
            inventory: inventory.filter(i => i.name.trim()),
            craftingMaterials: crafting.filter(m => m.name.trim()),
          }
          if (currency !== '') patch.currency = parseInt(currency, 10)
          return onSave(patch)
        })}
      >
        {label}
      </Button>
    </Section>
  )
}
