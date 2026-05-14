'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { CharacterSchema } from '@larpdb/shared'
import { Plus } from 'lucide-react'

export default function SchemasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [schemas, setSchemas] = useState<CharacterSchema[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api.get<CharacterSchema[]>('/character-schemas')
      .then(setSchemas)
      .finally(() => setLoading(false))
  }, [user])

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }

  async function handleActivate(id: string) {
    await api.post(`/character-schemas/${id}/activate`)
    const updated = await api.get<CharacterSchema[]>('/character-schemas')
    setSchemas(updated)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Character Schemas</h1>
        <Button onClick={() => router.push('/admin/schemas/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New schema
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : schemas.length === 0 ? (
        <p className="text-muted-foreground">No schemas yet. Create one to get started.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Version</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Fields</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {schemas.map(s => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4 text-muted-foreground">v{s.version}</td>
                    <td className="p-4">
                      {s.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{s.fields.length} fields</td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        <Link
                          href={`/admin/schemas/${s.id}`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Edit
                        </Link>
                        {!s.isActive && (
                          <Button size="sm" onClick={() => void handleActivate(s.id)}>
                            Activate
                          </Button>
                        )}
                      </div>
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
