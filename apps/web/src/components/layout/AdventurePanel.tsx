import { Card, CardContent } from '@/components/ui/card'

interface AdventurePanelGame {
  id: string
  name: string
  slug: string
}

interface AdventurePanelProps {
  games: AdventurePanelGame[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function AdventurePanel({ games, selectedId, onSelect }: AdventurePanelProps) {
  return (
    <Card className="w-64 shrink-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="px-3 py-2 bg-muted text-xs font-semibold text-muted-foreground border-b border-border uppercase tracking-wide">
          Your Adventures
        </div>
        {games.map(g => (
          <button
            key={g.id}
            data-testid="adventure-panel-item"
            onClick={() => onSelect(g.id)}
            className={`w-full text-left px-3 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
              selectedId === g.id ? 'bg-muted' : ''
            }`}
          >
            <p className="text-sm font-medium truncate">{g.name}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
