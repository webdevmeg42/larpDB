'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { CharacterSchema } from '@larpdb/shared'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'

export default function SchemasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [schemas, setSchemas] = useState<CharacterSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    api.get<CharacterSchema[]>('/character-schemas')
      .then(setSchemas)
      .finally(() => setLoading(false))
  }, [user])

  if (user?.role !== 'owner') {
    return <div className="p-6 text-muted-foreground">Owner access required.</div>
  }

  const groups = Object.values(
    schemas.reduce<Record<string, CharacterSchema[]>>((acc, s) => {
      if (!acc[s.name]) acc[s.name] = []
      acc[s.name]!.push(s)
      return acc
    }, {}),
  )
    .map(versions => ({
      name: versions[0]!.name,
      versions: [...versions].sort((a, b) => b.version - a.version),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  function toggleExpanded(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function refreshSchemas() {
    const updated = await api.get<CharacterSchema[]>('/character-schemas')
    setSchemas(updated)
  }

  async function handleActivate(id: string) {
    await api.post(`/character-schemas/${id}/activate`)
    await refreshSchemas()
  }

  async function handleDeactivate(id: string) {
    await api.post(`/character-schemas/${id}/deactivate`)
    await refreshSchemas()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete this version of "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/character-schemas/${id}`)
      setSchemas(prev => prev.filter(s => s.id !== id))
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete schema'))
    }
  }

  function ActionButtons({ s }: { s: CharacterSchema }) {
    return (
      <div className="flex gap-2 justify-end">
        <Link
          href={`/admin/schemas/${s.id}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Edit
        </Link>
        {s.isActive ? (
          <Button size="sm" variant="outline" onClick={() => void handleDeactivate(s.id)}>
            Deactivate
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={() => void handleActivate(s.id)}>
              Activate
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void handleDelete(s.id, s.name)}>
              Delete
            </Button>
          </>
        )}
      </div>
    )
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
      ) : groups.length === 0 ? (
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
                {groups.map(({ name, versions }) => {
                  const isExpanded = expanded.has(name)
                  const hasMultiple = versions.length > 1
                  const latest = versions[0]!
                  const anyActive = versions.some(v => v.isActive)

                  return (
                    <Fragment key={name}>
                      <tr className="border-b last:border-0">
                        <td className="p-4 font-medium">
                          {hasMultiple ? (
                            <button
                              onClick={() => toggleExpanded(name)}
                              className="flex items-center gap-1.5 hover:text-primary transition-colors text-left"
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              }
                              {name}
                              <span className="text-xs text-muted-foreground font-normal">
                                ({versions.length} versions)
                              </span>
                            </button>
                          ) : (
                            name
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {hasMultiple ? (isExpanded ? '' : `v1–v${latest.version}`) : `v${latest.version}`}
                        </td>
                        <td className="p-4">
                          {anyActive
                            ? <Badge>Active</Badge>
                            : <Badge variant="outline">Inactive</Badge>
                          }
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {!isExpanded ? `${latest.fields.length} fields` : ''}
                        </td>
                        <td className="p-4">
                          {!hasMultiple && <ActionButtons s={latest} />}
                        </td>
                      </tr>

                      {isExpanded && versions.map(v => (
                        <tr key={v.id} className="border-b last:border-0 bg-muted/40">
                          <td className="p-4 pl-10 text-muted-foreground">{name}</td>
                          <td className="p-4 text-muted-foreground">v{v.version}</td>
                          <td className="p-4">
                            {v.isActive
                              ? <Badge>Active</Badge>
                              : <Badge variant="outline">Inactive</Badge>
                            }
                          </td>
                          <td className="p-4 text-muted-foreground">{v.fields.length} fields</td>
                          <td className="p-4">
                            <ActionButtons s={v} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
