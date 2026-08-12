'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getErrorMessage } from '@/lib/utils'
import type { AdminCharacter } from '@plotrunner/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export function AdminCharactersPageClient({ initialCharacters }: { initialCharacters: AdminCharacter[] }) {
  const [characters, setCharacters] = useState<AdminCharacter[]>(initialCharacters)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminCharacter | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const filtered = search.trim()
    ? characters.filter(c =>
        [c.name, c.gameName, c.playerDisplayName].some(s =>
          s.toLowerCase().includes(search.trim().toLowerCase())
        )
      )
    : characters

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setRowError(null)
    try {
      const res = await fetch(`${API_URL}/characters/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Game-Id': deleteTarget.gameId },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Failed to delete character')
      }
      setCharacters(cs => cs.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteTarget(null)
      setRowError(getErrorMessage(err, 'Failed to delete character'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">All Characters</h1>

      {rowError && (
        <p className="text-sm text-destructive mb-4">{rowError}</p>
      )}

      <input
        data-testid="characters-search-input"
        type="search"
        aria-label="Search characters"
        placeholder="Search by name, game, or player…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-xs px-3 py-1.5 text-sm border rounded-md bg-background mb-4"
      />

      {characters.length === 0 ? (
        <p className="text-muted-foreground">No characters found.</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No characters match your search.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 text-left font-medium">Character</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Game</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Player</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">XP</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.gameName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.playerDisplayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.totalXp}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      data-testid="delete-char-btn"
                      onClick={() => setDeleteTarget(c)}
                      aria-label={`Delete ${c.name}`}
                      className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                    >
                      Delete
                    </button>
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
          This permanently deletes the character and all associated data. This cannot be undone.
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
