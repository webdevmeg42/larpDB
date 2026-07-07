'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface MyGame {
  id: string
  name: string
  role: string
  status: string
}

export default function RulebookPage() {
  const { user } = useAuth()
  const [games, setGames] = useState<MyGame[]>([])
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
        <p className="text-muted-foreground">You haven&apos;t joined any LARPs yet.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Rulebook</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">LARP</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{g.role}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/rulebook/${g.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      {g.role === 'owner' ? 'Edit Rulebook' : 'View Rulebook'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
