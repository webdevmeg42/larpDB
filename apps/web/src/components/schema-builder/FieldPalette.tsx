import { Button } from '@/components/ui/button'
import type { SchemaFieldType } from '@larpdb/shared'
import {
  Type,
  AlignLeft,
  Hash,
  List,
  CheckSquare,
  ToggleLeft,
  BarChart2,
  Minus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const FIELD_TYPES: { type: SchemaFieldType; label: string; icon: LucideIcon }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'longtext', label: 'Long Text', icon: AlignLeft },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'select', label: 'Select', icon: List },
  { type: 'multiselect', label: 'Multi-select', icon: CheckSquare },
  { type: 'toggle', label: 'Toggle', icon: ToggleLeft },
  { type: 'statblock', label: 'Stat Block', icon: BarChart2 },
  { type: 'section', label: 'Section', icon: Minus },
]

interface FieldPaletteProps {
  onAdd: (type: SchemaFieldType) => void
}

export function FieldPalette({ onAdd }: FieldPaletteProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Add field</p>
      {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
        <Button
          key={type}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => onAdd(type)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  )
}
