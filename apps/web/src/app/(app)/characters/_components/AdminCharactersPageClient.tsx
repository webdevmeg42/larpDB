'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { getErrorMessage } from '@/lib/utils'
import type { AdminCharacter } from '@plotrunner/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

type BlockAction =
  | { type: 'block-char'; row: AdminCharacter }
  | { type: 'unblock-char'; row: AdminCharacter }
  | { type: 'block-user'; row: AdminCharacter }
  | { type: 'unblock-user'; row: AdminCharacter }

export function AdminCharactersPageClient({ initialCharacters }: { initialCharacters: AdminCharacter[] }) {
  const [characters, setCharacters] = useState<AdminCharacter[]>(initialCharacters)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminCharacter | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [blockAction, setBlockAction] = useState<BlockAction | null>(null)
  const [blockInput, setBlockInput] = useState('')
  const [blocking, setBlocking] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)

  const term = search.trim().toLowerCase()
  const filtered = term
    ? characters.filter(c =>
        [c.name, c.gameName, c.playerDisplayName].some(s => s.toLowerCase().includes(term))
      )
    : characters

  function closeDialog() {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  function closeBlockDialog() {
    setBlockAction(null)
    setBlockInput('')
    setBlockError(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
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
      closeDialog()
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Failed to delete character'))
    } finally {
      setDeleting(false)
    }
  }

  async function handleBlock() {
    if (!blockAction) return
    setBlocking(true)
    setBlockError(null)
    try {
      const { type, row } = blockAction
      const isBlockOp = type.startsWith('block-')
      const suffix = isBlockOp ? 'block' : 'unblock'

      if (type === 'block-char' || type === 'unblock-char') {
        const res = await fetch(`${API_URL}/admin/characters/${row.id}/${suffix}`, {
          method: 'PATCH',
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? 'Failed to update character')
        }
        setCharacters(cs => cs.map(c => c.id === row.id ? { ...c, isBlocked: isBlockOp } : c))
      } else {
        const res = await fetch(`${API_URL}/admin/users/${row.userId}/${suffix}`, {
          method: 'PATCH',
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? 'Failed to update user')
        }
        setCharacters(cs => cs.map(c => c.userId === row.userId ? { ...c, userIsBlocked: isBlockOp } : c))
      }
      closeBlockDialog()
    } catch (err) {
      setBlockError(getErrorMessage(err, 'Operation failed'))
    } finally {
      setBlocking(false)
    }
  }

  const isBlockDialog = !!blockAction && blockAction.type.startsWith('block-')
  const isUnblockDialog = !!blockAction && blockAction.type.startsWith('unblock-')

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">All Characters</h1>

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
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.playerDisplayName}
                    {c.userIsBlocked && (
                      <span className="ml-1 text-xs text-destructive">(user blocked)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.totalXp}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isBlocked ? 'destructive' : c.isActive ? 'default' : 'secondary'}>
                      {c.isBlocked ? 'Blocked' : c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        data-testid={`delete-char-btn-${c.id}`}
                        onClick={() => setDeleteTarget(c)}
                        aria-label={`Delete ${c.name}`}
                        className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                      >
                        Delete
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label={`More actions for ${c.name}`}
                            className="text-xs text-muted-foreground hover:text-foreground px-1 leading-none"
                          >
                            •••
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.isBlocked ? (
                            <DropdownMenuItem onClick={() => setBlockAction({ type: 'unblock-char', row: c })}>
                              Unblock character
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem destructive onClick={() => setBlockAction({ type: 'block-char', row: c })}>
                              Block character
                            </DropdownMenuItem>
                          )}
                          {c.userIsBlocked ? (
                            <DropdownMenuItem onClick={() => setBlockAction({ type: 'unblock-user', row: c })}>
                              Unblock user
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem destructive onClick={() => setBlockAction({ type: 'block-user', row: c })}>
                              Block user
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onClose={closeDialog}>
        <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
        <DialogDescription>
          This permanently deletes the character and all associated data. This cannot be undone.
        </DialogDescription>
        {deleteError && (
          <p role="alert" className="text-sm text-destructive mt-2">{deleteError}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={closeDialog} disabled={deleting}>
            Cancel
          </Button>
          <Button data-testid="confirm-delete-btn" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>

      {/* Block dialog (type to confirm) */}
      <Dialog open={isBlockDialog} onClose={closeBlockDialog}>
        <DialogTitle>
          {blockAction?.type === 'block-char' && `Block ${blockAction.row.name}?`}
          {blockAction?.type === 'block-user' && `Block ${blockAction.row.playerDisplayName}?`}
        </DialogTitle>
        <DialogDescription>
          {blockAction?.type === 'block-char' && 'This will make this character not available. '}
          {blockAction?.type === 'block-user' && "This will make this user's account not available and deactivate all their characters and owned adventures. "}
          You can reverse this at any time.
        </DialogDescription>
        {blockError && <p role="alert" className="text-sm text-destructive mt-2">{blockError}</p>}
        <input
          aria-label="Type BLOCK to confirm"
          placeholder="Type BLOCK to confirm"
          value={blockInput}
          onChange={e => setBlockInput(e.target.value)}
          className="mt-3 w-full px-3 py-1.5 text-sm border rounded-md bg-background"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={closeBlockDialog} disabled={blocking}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => void handleBlock()}
            disabled={blocking || blockInput !== 'BLOCK'}
          >
            {blocking ? 'Blocking…' : 'Block'}
          </Button>
        </div>
      </Dialog>

      {/* Unblock dialog (plain confirm) */}
      <Dialog open={isUnblockDialog} onClose={closeBlockDialog}>
        <DialogTitle>
          {blockAction?.type === 'unblock-char' && `Unblock ${blockAction.row.name}?`}
          {blockAction?.type === 'unblock-user' && `Unblock ${blockAction.row.playerDisplayName}?`}
        </DialogTitle>
        <DialogDescription>
          {blockAction?.type === 'unblock-user' && "This will restore the user's access and set all their characters and owned adventures to active. "}
          {blockAction?.type === 'unblock-char' && 'This will restore access to this character. '}
          You can block again at any time.
        </DialogDescription>
        {blockError && <p role="alert" className="text-sm text-destructive mt-2">{blockError}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={closeBlockDialog} disabled={blocking}>Cancel</Button>
          <Button onClick={() => void handleBlock()} disabled={blocking}>
            {blocking ? 'Unblocking…' : 'Unblock'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
