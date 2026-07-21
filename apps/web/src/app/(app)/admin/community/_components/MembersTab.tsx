'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { setGameId } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronRight, X } from 'lucide-react'

type AdminMember = {
  id: string
  userId: string
  displayName: string
  email: string
  role: 'owner' | 'gm' | 'player'
  joinedAt: string
}

type MemberGame = {
  id: string
  name: string
  members: AdminMember[]
}

export function MembersTab() {
  const { user } = useAuth()
  const [games, setGames] = useState<MemberGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [promoting, setPromoting] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ games: MemberGame[] }>('/admin-members')
      setGames(data.games)
    } catch {
      setError('Failed to load members.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadMembers()
  }, [user, loadMembers])

  useEffect(() => {
    if (!search) { setOpenSections(new Set()); return }
    const newOpen = new Set<string>()
    for (const g of games) {
      if (g.members.some(m => m.displayName.toLowerCase().includes(search.toLowerCase()))) {
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

  async function handleRoleChange(g: MemberGame, memberId: string, userId: string, newRole: 'gm' | 'player') {
    setPromoting(memberId)
    setError(null)
    setGameId(g.id)
    try {
      const updated = await api.patch<{ role: string }>(`/games/${g.id}/members/${userId}/role`, { role: newRole })
      setGames(prev => prev.map(pg =>
        pg.id === g.id
          ? { ...pg, members: pg.members.map(m => m.id === memberId ? { ...m, role: updated.role as AdminMember['role'] } : m) }
          : pg
      ))
    } catch {
      setError('Failed to update role. Please try again.')
    } finally {
      setPromoting(null)
    }
  }

  const filteredGames = search
    ? games
        .map(g => ({ ...g, members: g.members.filter(m => m.displayName.toLowerCase().includes(search.toLowerCase())) }))
        .filter(g => g.members.length > 0)
    : games

  const roleBadge: Record<string, 'default' | 'secondary' | 'outline'> = {
    owner: 'default', gm: 'secondary', player: 'outline',
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search members…"
          aria-label="Search members"
          className="w-full px-4 py-2 rounded-md border border-border bg-card text-sm pr-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {games.length === 0 ? (
        <p className="text-muted-foreground text-sm">You don&apos;t manage members for any Adventures yet.</p>
      ) : filteredGames.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No results for &ldquo;{search}&rdquo;</p>
      ) : (
        <div className="space-y-2">
          {filteredGames.map(g => {
            const isOpen = openSections.has(g.id)
            const isOwnerInThisGame = g.members.some(m => m.userId === user?.id && m.role === 'owner')
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
                    {g.members.length} member{g.members.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {isOpen && (
                  <CardContent className="p-0 border-t border-border">
                    {g.members.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">No members yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="px-4 py-2 font-medium">Name</th>
                            <th className="px-4 py-2 font-medium">Email</th>
                            <th className="px-4 py-2 font-medium">Role</th>
                            <th className="px-4 py-2 font-medium">Joined</th>
                            {isOwnerInThisGame && <th className="px-4 py-2 font-medium">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {g.members.map(m => (
                            <tr key={m.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                              <td className="px-4 py-3 font-medium">{m.displayName}</td>
                              <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                              <td className="px-4 py-3">
                                <Badge variant={roleBadge[m.role] ?? 'outline'}>{m.role}</Badge>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {new Date(m.joinedAt).toLocaleDateString()}
                              </td>
                              {isOwnerInThisGame && (
                                <td className="px-4 py-3">
                                  {m.role === 'owner' ? (
                                    <span className="text-muted-foreground text-xs">Cannot change</span>
                                  ) : m.role === 'player' ? (
                                    <Button size="sm" variant="outline"
                                      onClick={() => void handleRoleChange(g, m.id, m.userId, 'gm')}
                                      disabled={promoting === m.id}
                                    >
                                      {promoting === m.id ? 'Saving…' : 'Promote to GM'}
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="ghost"
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={() => void handleRoleChange(g, m.id, m.userId, 'player')}
                                      disabled={promoting === m.id}
                                    >
                                      {promoting === m.id ? 'Saving…' : 'Demote to Player'}
                                    </Button>
                                  )}
                                </td>
                              )}
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
