'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SchemaField } from '@plotrunner/shared'

const EQUIPMENT_CATEGORIES = [
  'Weapons',
  'Ammo',
  'Light Armor',
  'Medium Armor',
  'Heavy Armor',
  'Shield',
  'Adventure Gear',
  'Utility',
  'Tools',
  'Alchemical and Poison',
  'Mounts/Vehicles',
  'Other',
]

interface EquipmentSlot {
  category: string
  name: string
}

interface EquipmentValue {
  equipment: EquipmentSlot[]
  treasure: EquipmentSlot[]
}

interface PreviewProps {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
}

export function EquipmentFieldPreview({ field, value, onChange }: PreviewProps) {
  const data = (value as EquipmentValue | undefined) ?? { equipment: [], treasure: [] }
  const equipSlots = field.equipmentSlots ?? 0
  const treasureSlots = field.treasureSlots ?? 0

  function updateSlot(kind: 'equipment' | 'treasure', idx: number, patch: Partial<EquipmentSlot>) {
    const arr = [...(data[kind] ?? [])]
    arr[idx] = { category: '', name: '', ...(arr[idx] ?? {}), ...patch }
    onChange({ ...data, [kind]: arr })
  }

  function SlotRow({ kind, idx }: { kind: 'equipment' | 'treasure'; idx: number }) {
    const slot = data[kind]?.[idx] ?? { category: '', name: '' }
    return (
      <div className="flex gap-2">
        <select
          value={slot.category}
          onChange={e => updateSlot(kind, idx, { category: e.target.value })}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm shrink-0 w-44"
        >
          <option value="">Category…</option>
          {EQUIPMENT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <Input
          value={slot.name}
          onChange={e => updateSlot(kind, idx, { name: e.target.value })}
          placeholder="Item name or description"
          className="text-sm"
        />
      </div>
    )
  }

  if (equipSlots === 0 && treasureSlots === 0) {
    return (
      <div className="space-y-1">
        <Label className="text-sm">{field.label || '(Equipment)'}</Label>
        <p className="text-xs text-muted-foreground italic">Set slot counts in the editor →</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {equipSlots > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">
            Equipment
            <span className="text-xs text-muted-foreground font-normal ml-1">({equipSlots} slots)</span>
          </Label>
          <div className="space-y-2">
            {Array.from({ length: equipSlots }, (_, i) => (
              <SlotRow key={i} kind="equipment" idx={i} />
            ))}
          </div>
        </div>
      )}
      {treasureSlots > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">
            Treasure
            <span className="text-xs text-muted-foreground font-normal ml-1">({treasureSlots} slots)</span>
          </Label>
          <div className="space-y-2">
            {Array.from({ length: treasureSlots }, (_, i) => (
              <SlotRow key={i} kind="treasure" idx={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
