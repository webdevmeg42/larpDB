'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Lock, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SchemaField } from '@plotrunner/shared'

function LockedFieldItem({
  field,
  isSelected,
  onSelect,
}: {
  field: SchemaField
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border bg-muted/40 p-2 cursor-pointer transition-colors',
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:bg-muted/60',
      )}
      onClick={onSelect}
    >
      <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm font-medium truncate text-muted-foreground">
        {field.label}
      </span>
      <Badge variant="outline" className="text-xs shrink-0">{field.type}</Badge>
      {field.required && (
        <span className="text-xs text-destructive shrink-0">*</span>
      )}
    </div>
  )
}

function SortableFieldItem({
  field,
  isSelected,
  onSelect,
  onDelete,
  isUnlabeled,
}: {
  field: SchemaField
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  isUnlabeled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-background p-2 cursor-pointer transition-colors',
        isSelected
          ? 'ring-2 ring-primary border-primary'
          : isUnlabeled
            ? 'border-destructive hover:bg-muted/50'
            : 'hover:bg-muted/50',
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium truncate">
        {field.label || `(Unnamed ${field.type})`}
      </span>
      <Badge variant="outline" className="text-xs shrink-0">{field.type}</Badge>
      {field.required && (
        <span className="text-xs text-destructive shrink-0">*</span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface FieldListProps {
  fields: SchemaField[]
  lockedFields?: SchemaField[]
  selectedId: string | null
  onSelect: (id: string) => void
  onReorder: (fields: SchemaField[]) => void
  onDelete: (id: string) => void
  highlightUnlabeled?: boolean
}

export function FieldList({ fields, lockedFields = [], selectedId, onSelect, onReorder, onDelete, highlightUnlabeled }: FieldListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id)
      const newIndex = fields.findIndex(f => f.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(fields, oldIndex, newIndex))
      }
    }
  }

  if (lockedFields.length === 0 && fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 rounded-md border-2 border-dashed text-muted-foreground text-sm">
        ← Add fields from the palette
      </div>
    )
  }

  return (
    <div data-testid="field-list" className="space-y-1">
      {lockedFields.map(field => (
        <LockedFieldItem
          key={field.id}
          field={field}
          isSelected={selectedId === field.id}
          onSelect={() => onSelect(field.id)}
        />
      ))}

      {fields.length === 0 && lockedFields.length > 0 ? (
        <div className="flex items-center justify-center h-16 rounded-md border-2 border-dashed text-muted-foreground text-xs mt-1">
          ← Add more fields from the palette
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {fields.map(field => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  isSelected={selectedId === field.id}
                  onSelect={() => onSelect(field.id)}
                  onDelete={() => onDelete(field.id)}
                  isUnlabeled={!!highlightUnlabeled && !field.label.trim()}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
