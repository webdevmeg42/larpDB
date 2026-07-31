'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getGameId, setGameId } from '@/lib/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'

type CharacterSummary = {
  id: string
  name: string
  totalXp: number
  isActive: boolean
}

type GameWithCharacters = {
  id: string
  name: string
  slug: string
  isActive: boolean
  characters: CharacterSummary[]
}

export function CharactersPageClient({ initialData }: { initialData: { games: GameWithCharacters[] } }) {
  const router = useRouter()
  const [games] = useState<GameWithCharacters[]>(initialData.games)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (games.length > 0) {
      const saved = getGameId()
      const initial = games.find(g => g.id === saved) ?? games[0]!
      setSelectedGameId(initial.id)
      setGameId(initial.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredGames = games.filter(
    g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.characters.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  )

  const selectedGame =
    filteredGames.find(g => g.id === selectedGameId) ??
    (selectedGameId === null ? (filteredGames[0] ?? null) : null)

  const visibleCharacters = selectedGame
    ? search && !selectedGame.name.toLowerCase().includes(search.toLowerCase())
      ? selectedGame.characters.filter(c =>
          c.name.toLowerCase().includes(search.toLowerCase())
        )
      : selectedGame.characters
    : []

  function handleNewCharacter(g: GameWithCharacters) {
    setGameId(g.id)
    router.push('/characters/new')
  }

  if (games.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">You haven&apos;t joined any Adventures yet.</p>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">My Characters</h1>

      {/* Search bar */}
      <div className="relative max-w-md">
        <input
          data-testid="characters-search-input"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Adventures or characters…"
          aria-label="Search Adventures or characters"
          className="w-full px-4 py-2 rounded-md border border-border bg-card text-sm pr-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Master / detail panels */}
      <div className="flex gap-4 min-h-[400px]">
        {/* Left panel — Adventure list */}
        <Card data-testid="adventure-list-panel" className="w-64 shrink-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-3 py-2 bg-muted text-xs font-semibold text-muted-foreground border-b border-border uppercase tracking-wide">
              Your Adventures
            </div>
            {filteredGames.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground italic">
                No results for &ldquo;{search}&rdquo;
              </p>
            ) : (
              filteredGames.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGameId(g.id); setGameId(g.id) }}
                  className={`w-full text-left px-3 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                    selectedGame?.id === g.id ? 'bg-muted' : ''
                  }`}
                >
                  <p
                    className={`text-sm font-medium truncate ${
                      g.characters.length === 0 ? 'text-muted-foreground italic' : ''
                    }`}
                  >
                    {g.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.characters.length === 0
                      ? 'no characters'
                      : `${g.characters.length} character${g.characters.length === 1 ? '' : 's'}`}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right panel — character table */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            {selectedGame ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {selectedGame.name}
                  </span>
                  <Button
                    data-testid="new-character-btn"
                    size="sm"
                    onClick={() => handleNewCharacter(selectedGame)}
                    disabled={!selectedGame.isActive}
                    title={!selectedGame.isActive ? 'This Adventure is inactive' : undefined}
                  >
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    New Character
                  </Button>
                </div>

                {visibleCharacters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <p className="text-sm text-muted-foreground">No characters yet.</p>
                    <Button
                      data-testid="new-character-btn"
                      size="sm"
                      onClick={() => handleNewCharacter(selectedGame)}
                      disabled={!selectedGame.isActive}
                    >
                      <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                      New Character
                    </Button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">XP</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCharacters.map(c => (
                        <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{c.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.totalXp} XP</td>
                          <td className="px-4 py-3">
                            {c.isActive ? (
                              <Badge>Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/characters/${c.id}`}
                              className={buttonVariants({ variant: 'outline', size: 'sm' })}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-muted-foreground">Select an Adventure to view characters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
