'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { AdminGame } from '@plotrunner/shared'

export function AdminAdventuresPageClient({ initialGames }: { initialGames: AdminGame[] }) {
  const router = useRouter()
  const [games, setGames] = useState<AdminGame[]>(initialGames)
  const [rowError, setRowError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminGame | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [query, setQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')

  const ownerOptions = [...new Set(
    games.map(g => g.ownerDisplayName).filter((n): n is string => n !== null)
  )].sort()

  const normalizedQuery = query.trim().toLowerCase()
  const visibleGames = games.filter(g => {
    const matchesName = !normalizedQuery || g.name.toLowerCase().includes(normalizedQuery)
    const matchesOwner = !ownerFilter || g.ownerDisplayName === ownerFilter
    return matchesName && matchesOwner
  })

  async function handleStatusToggle(target: AdminGame) {
    const newStatus = target.status === 'active' ? 'inactive' : 'active'
    setRowError(null)
    try {
      await api.patch<AdminGame>(`/games/${target.id}/status`, { status: newStatus })
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
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All Adventures</h1>
        <Button onClick={() => router.push('/adventures/new')}>+ Build New Adventure</Button>
      </div>

      {rowError && <p className="text-sm text-destructive mb-4">{rowError}</p>}

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          data-testid="games-search-input"
          type="search"
          aria-label="Search games by name"
          placeholder="Search by name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-background"
        />
        <select
          aria-label="Filter by owner"
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-background"
        >
          <option value="">All owners</option>
          {ownerOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {games.length === 0 ? (
        <p className="text-muted-foreground">No adventures found.</p>
      ) : visibleGames.length === 0 ? (
        <p className="text-muted-foreground">No games match your search.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 text-left font-medium">Game</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Owner</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Members</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleGames.map(g => (
                <tr key={g.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{g.name}</div>
                    {g.description && (
                      <div className="text-xs text-muted-foreground">{g.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{g.ownerDisplayName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={g.status === 'active' ? 'default' : 'secondary'}>
                      {g.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{g.memberCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/adventures/${g.id}/edit`}
                        aria-label={`Edit ${g.name}`}
                        className="text-gold hover:underline text-xs"
                      >
                        Edit
                      </Link>
                      <span aria-hidden="true" className="text-muted-foreground">|</span>
                      <button
                        data-testid="enable-adv-btn"
                        onClick={() => void handleStatusToggle(g)}
                        aria-label={g.status === 'active' ? `Disable ${g.name}` : `Enable ${g.name}`}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {g.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <span aria-hidden="true" className="text-muted-foreground">|</span>
                      <button
                        data-testid="delete-adv-btn"
                        onClick={() => setDeleteTarget(g)}
                        aria-label={`Delete ${g.name}`}
                        className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
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
          <Button
            data-testid="confirm-delete-btn"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
