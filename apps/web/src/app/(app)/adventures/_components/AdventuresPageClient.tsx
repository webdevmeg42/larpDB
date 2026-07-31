'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { MyGame } from '@plotrunner/shared'

export function AdventuresPageClient({ initialGames }: { initialGames: MyGame[] }) {
  const { user } = useAuth()
  const router = useRouter()
  const [games, setGames] = useState<MyGame[]>(initialGames)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MyGame | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const visibleGames = normalizedQuery
    ? games.filter(g => g.name.toLowerCase().includes(normalizedQuery))
    : games

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">This page doesn&apos;t exist.</div>
  }

  async function handleStatusToggle(target: MyGame) {
    const newStatus = target.status === 'active' ? 'inactive' : 'active'
    setRowError(null)
    try {
      await api.patch<MyGame>(`/games/${target.id}/status`, { status: newStatus })
      setGames(gs => gs.map(g => g.id === target.id ? { ...g, status: newStatus } : g))
    } catch (err) {
      setRowError(getErrorMessage(err, 'Failed to update status'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setRowError(null)
    try {
      await api.delete<void>(`/games/${deleteTarget.id}`)
      setGames(gs => gs.filter(g => g.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteTarget(null)
      setRowError(getErrorMessage(err, 'Failed to delete game'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Adventure Builder</h1>
        <Button onClick={() => router.push('/adventures/new')}>+ Build New Adventure</Button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      {rowError && <p className="text-sm text-destructive mb-4">{rowError}</p>}

      <input
        data-testid="games-search-input"
        type="search"
        aria-label="Search games by name"
        placeholder="Search by name…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full max-w-xs px-3 py-1.5 text-sm border rounded-md bg-background mb-4"
      />

      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="text-5xl">🗺️</div>
          <h2 className="text-xl font-semibold">Build your first Adventure</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Adventures are persistent LARP worlds where players join, build characters, and attend events.
          </p>
          <Button onClick={() => router.push('/adventures/new')}>+ Build New Adventure</Button>
        </div>
      ) : visibleGames.length === 0 ? (
        <p className="text-muted-foreground">No games match your search.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Game</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Members</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleGames.map(g => (
                <tr
                  key={g.id}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{g.name}</div>
                    {g.description && (
                      <div className="text-xs text-muted-foreground">{g.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={g.status === 'active' ? 'default' : 'secondary'}>
                      {g.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={g.role === 'owner' ? 'default' : 'outline'}>
                      {g.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{g.memberCount}</td>
                  <td className="px-4 py-3 text-right">
                    {g.role === 'owner' ? (
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/adventures/${g.id}/edit`}
                          className="text-gold hover:underline text-xs"
                        >
                          Edit
                        </Link>
                        <span className="text-muted-foreground">|</span>
                        <button
                          data-testid="enable-adv-btn"
                          onClick={() => void handleStatusToggle(g)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {g.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <span className="text-muted-foreground">|</span>
                        <button
                          data-testid="delete-adv-btn"
                          onClick={() => setDeleteTarget(g)}
                          className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
        <DialogDescription>
          This permanently deletes the Adventure and all its data — members, characters, events, and
          everything else. This cannot be undone.
        </DialogDescription>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button data-testid="confirm-delete-btn" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
