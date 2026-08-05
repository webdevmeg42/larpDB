import { Button } from '@/components/ui/button'
import type { SchemaFieldType, CharacterSchemaType } from '@plotrunner/shared'
import {
  Type,
  AlignLeft,
  Hash,
  List,
  CheckSquare,
  ToggleLeft,
  BarChart2,
  Minus,
  Backpack,
  Heart,
  Sparkles,
  Globe,
  User,
  HeartPulse,
  Swords,
  Wand2,
  Languages,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ALL_FIELD_TYPES: { type: SchemaFieldType; label: string; icon: LucideIcon }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'longtext', label: 'Long Text', icon: AlignLeft },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'select', label: 'Dropdown Select', icon: List },
  { type: 'multiselect', label: 'Multi-select', icon: CheckSquare },
  { type: 'toggle', label: 'Toggle', icon: ToggleLeft },
  { type: 'statblock', label: 'Stat Block', icon: BarChart2 },
  { type: 'section', label: 'Section', icon: Minus },
  { type: 'equipment', label: 'Equipment', icon: Backpack },
  { type: 'appearance', label: 'Appearance', icon: User },
  { type: 'personality', label: 'Personality', icon: Heart },
  { type: 'features', label: 'Features', icon: Sparkles },
  { type: 'influences', label: 'Influences', icon: Globe },
  { type: 'languages', label: 'Languages', icon: Languages },
  { type: 'hitpoints', label: 'Hit Points', icon: HeartPulse },
  { type: 'attacks', label: 'Attacks', icon: Swords },
  { type: 'spells', label: 'Spells', icon: Wand2 },
]

const RACE_AVAILABLE: SchemaFieldType[] = [
  'text', 'longtext', 'number', 'select', 'multiselect', 'toggle', 'statblock',
  'equipment', 'appearance', 'personality', 'features', 'influences', 'languages',
]
const RACE_RECOMMENDED: SchemaFieldType[] = [
  'appearance', 'personality', 'features', 'influences', 'languages', 'equipment',
]

const CLASS_AVAILABLE: SchemaFieldType[] = [
  'text', 'longtext', 'number', 'select', 'multiselect', 'toggle', 'statblock', 'section',
  'equipment', 'appearance', 'personality', 'features', 'influences', 'hitpoints', 'attacks', 'spells',
]
const CLASS_RECOMMENDED: SchemaFieldType[] = ['hitpoints', 'attacks', 'spells', 'statblock', 'features', 'multiselect', 'number', 'section']

const SELF_LABELED: Set<SchemaFieldType> = new Set([
  'equipment', 'appearance', 'personality', 'features', 'influences', 'languages',
  'hitpoints', 'attacks', 'spells',
])

interface FieldPaletteProps {
  onAdd: (type: SchemaFieldType, defaultLabel?: string) => void
  schemaType?: CharacterSchemaType
}

export function FieldPalette({ onAdd, schemaType }: FieldPaletteProps) {
  if (!schemaType) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Add field</p>
        {ALL_FIELD_TYPES.map(({ type, label, icon: Icon }) => (
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

  const available = schemaType === 'race' ? RACE_AVAILABLE : CLASS_AVAILABLE
  const recommended = schemaType === 'race' ? RACE_RECOMMENDED : CLASS_RECOMMENDED

  const recommendedFields = ALL_FIELD_TYPES.filter(f => recommended.includes(f.type))
  const otherFields = ALL_FIELD_TYPES.filter(f => available.includes(f.type) && !recommended.includes(f.type))

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {schemaType === 'race' ? 'Common for races' : 'Common for classes'}
        </p>
        {recommendedFields.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            data-testid={`palette-btn-${type}`}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => onAdd(type, SELF_LABELED.has(type) ? label : undefined)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>
      {otherFields.length > 0 && (
        <div className="space-y-1 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Other</p>
          {otherFields.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              data-testid={`palette-btn-${type}`}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => onAdd(type, SELF_LABELED.has(type) ? label : undefined)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
