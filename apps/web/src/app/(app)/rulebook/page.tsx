'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'

interface MyGame {
  id: string
  name: string
  role: string
  status: string
}

export default function RulebookPage() {
  const { user } = useAuth()
  const [games, setGames] = useState<MyGame[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api.get<MyGame[]>('/my-games')
      .then(all => setGames(all))
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return null

  if (loading) {
    return <p className="p-6 text-muted-foreground">Loading…</p>
  }

  if (games.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">You haven&apos;t joined any Adventures yet.</p>
      </div>
    )
  }

  const filteredGames = games.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-2xl flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Rulebook</h1>

      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Adventures…"
          aria-label="Search Adventures"
          className="w-full px-4 py-2 rounded-md border border-border bg-card text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-ring"
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

      <Card>
        <CardContent className="p-0">
          {filteredGames.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground italic">
              No results for &ldquo;{search}&rdquo;
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Adventure</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredGames.map(g => (
                  <tr key={g.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{g.role}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/rulebook/${g.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        {(g.role === 'owner' || g.role === 'gm') ? 'Edit Rulebook' : 'View Rulebook'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
