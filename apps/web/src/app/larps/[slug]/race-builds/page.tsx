'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { LarpPublicShell } from '../_components/LarpPublicShell'
import type { SchemaField } from '@larpdb/shared'

interface Schema {
  id: string
  name: string
  fields: SchemaField[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function RaceBuildsPage() {
  const params = useParams<{ slug: string }>()
  const [schemas, setSchemas] = useState<Schema[]>([])
  const [larpName, setLarpName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [publicRes, schemasRes] = await Promise.all([
          fetch(`${API_BASE}/games/${params.slug}/public`),
          fetch(`${API_BASE}/games/${params.slug}/schemas/race`),
        ])
        if (publicRes.status === 404 || schemasRes.status === 404) { setNotFound(true); return }
        const pub = await publicRes.json() as { siteTitle: string }
        const data = await schemasRes.json() as Schema[]
        setLarpName(pub.siteTitle)
        setSchemas(data)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [params.slug])

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (notFound) return <div className="p-6">LARP not found.</div>

  return (
    <LarpPublicShell title="Race Builds" subtitle="Playable races">
      {schemas.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
          No races have been published yet.
        </div>
      ) : (
        <div className="space-y-4">
          {schemas.map(schema => {
            const publicFields = schema.fields.filter(f => !f.gmOnly)
            return (
              <div key={schema.id} className="rounded-lg border p-5">
                <h2 className="text-base font-semibold mb-3">{schema.name}</h2>
                <div className="flex flex-wrap gap-2">
                  {publicFields.map(f => (
                    <span key={f.id} className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium">{f.label}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </LarpPublicShell>
  )
}
