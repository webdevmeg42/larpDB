'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { setGameId } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronRight, X } from 'lucide-react'

type AdminCharacter = {
  id: string
  name: string
  playerName: string | null
  totalXp: number
  isActive: boolean
}

type CharacterGame = {
  id: string
  name: string
  characters: AdminCharacter[]
}

export function CharactersTab() {
  const { user } = useAuth()
  const router = useRouter()
  const [games, setGames] = useState<CharacterGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const loadCharacters = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ games: CharacterGame[] }>('/admin-characters')
      setGames(data.games)
    } catch {
      setError('Failed to load characters.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadCharacters()
  }, [user, loadCharacters])

  useEffect(() => {
    if (!search) { setOpenSections(new Set()); return }
    const newOpen = new Set<string>()
    for (const g of games) {
      if (g.characters.some(c => c.name.toLowerCase().includes(search.toLowerCase()))) {
        newOpen.add(g.id)
      }
    }
    setOpenSections(newOpen)
  }, [search, games])

  function toggleSection(gameId: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(gameId)) next.delete(gameId)
      else next.add(gameId)
      return next
    })
  }

  const filteredGames = search
    ? games
        .map(g => ({ ...g, characters: g.characters.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) }))
        .filter(g => g.characters.length > 0)
    : games

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search characters…"
          aria-label="Search characters"
          className="w-full px-4 py-2 rounded-md border border-border bg-card text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {games.length === 0 ? (
        <p className="text-muted-foreground text-sm">No characters in any of your Adventures yet.</p>
      ) : filteredGames.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No results for &ldquo;{search}&rdquo;</p>
      ) : (
        <div className="space-y-2">
          {filteredGames.map(g => {
            const isOpen = openSections.has(g.id)
            return (
              <Card key={g.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSection(g.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleSection(g.id) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="font-medium text-sm flex-1">{g.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {g.characters.length} character{g.characters.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {isOpen && (
                  <CardContent className="p-0 border-t border-border">
                    {g.characters.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">No characters yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="px-4 py-2 font-medium">Character</th>
                            <th className="px-4 py-2 font-medium">Player</th>
                            <th className="px-4 py-2 font-medium">XP</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                            <th className="px-4 py-2 font-medium" />
                          </tr>
                        </thead>
                        <tbody>
                          {g.characters.map(c => (
                            <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                              <td className="px-4 py-3 font-medium">{c.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {c.playerName ?? <span className="text-xs italic">Unknown</span>}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{c.totalXp} XP</td>
                              <td className="px-4 py-3">
                                {c.isActive
                                  ? <Badge>Active</Badge>
                                  : <Badge variant="outline">Inactive</Badge>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setGameId(g.id); router.push(`/characters/${c.id}`) }}
                                >
                                  Edit
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
