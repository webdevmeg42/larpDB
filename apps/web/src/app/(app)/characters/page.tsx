'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Character } from '@larpdb/shared'
import { Plus } from 'lucide-react'

export default function CharactersPage() {
  const { user } = useAuth()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    api.get<Character[]>('/characters')
      .then(setCharacters)
      .catch(() => setError('Failed to load characters.'))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return null

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Characters</h1>
        <Link href="/characters/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          New character
        </Link>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : characters.length === 0 ? (
        <p className="text-muted-foreground">No characters yet. Create one to get started.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">XP</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {characters.map(c => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-4 font-medium">{c.name}</td>
                    <td className="p-4 text-muted-foreground">{c.totalXp} XP</td>
                    <td className="p-4">
                      {c.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                    </td>
                    <td className="p-4">
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
