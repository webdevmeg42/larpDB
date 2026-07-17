'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { CharacterSchema, CharacterSchemaType } from '@plotrunner/shared'
import { Plus, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

interface BuildsTabProps {
  type: CharacterSchemaType
  hasLevelingSystem: boolean
}

export default function BuildsTab({ type, hasLevelingSystem }: BuildsTabProps) {
  const [schemas, setSchemas] = useState<CharacterSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  const label = type === 'race' ? 'race' : 'class'
  const labelPlural = type === 'race' ? 'races' : 'classes'
  const description = type === 'race'
    ? 'Define the creature types players can choose — their appearance options, distinctive traits, and backstory lore. Examples: Human, Elf, Dwarf, Fairy.'
    : 'Define the character archetypes players can build — their stat blocks, abilities, and skills. Examples: Wizard, Bard, Warrior, Sorcerer.'

  useEffect(() => {
    api.get<CharacterSchema[]>('/character-schemas')
      .then(all => setSchemas(all.filter(s => s.type === type)))
      .finally(() => setLoading(false))
  }, [type])

  async function refreshSchemas() {
    const updated = await api.get<CharacterSchema[]>('/character-schemas')
    setSchemas(updated.filter(s => s.type === type))
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
      alert(getErrorMessage(err, 'Failed to delete'))
    }
  }

  function toggleExpanded(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
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

  const visibleGroups = query.trim()
    ? groups.filter(g => g.name.toLowerCase().includes(query.trim().toLowerCase()))
    : groups

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
            <Button size="sm" data-testid="builds-activate-btn" onClick={() => void handleActivate(s.id)}>
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
    <div className="space-y-4">
      {!hasLevelingSystem && (
        <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p data-testid="no-leveling-warning" className="text-sm">
            No leveling system selected. Go to{' '}
            <strong>The Codex → Leveling System</strong> to configure one before creating {labelPlural}.
          </p>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground max-w-lg">{description}</p>
          {!loading && (
            <p className="text-xs text-muted-foreground mt-1">
              {groups.length === 0
                ? `No ${labelPlural} yet.`
                : `${visibleGroups.length} ${visibleGroups.length === 1 ? label : labelPlural}`}
            </p>
          )}
        </div>
        <Link
          data-testid={`new-${type}-link`}
          href={hasLevelingSystem ? `/admin/schemas/new?type=${type}` : '#'}
          className={buttonVariants({ size: 'sm', variant: hasLevelingSystem ? 'default' : 'outline' })}
          aria-disabled={!hasLevelingSystem}
          onClick={e => { if (!hasLevelingSystem) e.preventDefault() }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New {label}
        </Link>
      </div>

      {!loading && groups.length > 0 && (
        <input
          type="search"
          placeholder={`Search ${labelPlural} by name…`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          data-testid="builds-search-input"
          className="w-full max-w-xs px-3 py-1.5 text-sm border rounded-md bg-background"
        />
      )}

      {!loading && groups.length > 0 && (
        visibleGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {labelPlural} match your search.</p>
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
                {visibleGroups.map(({ name, versions }) => {
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
                              data-testid="builds-expand-btn"
                              className="flex items-center gap-1.5 hover:text-primary transition-colors text-left"
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              {name}
                              <span className="text-xs text-muted-foreground font-normal">
                                ({versions.length} versions)
                              </span>
                            </button>
                          ) : name}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {hasMultiple ? (isExpanded ? '' : `v1–v${latest.version}`) : `v${latest.version}`}
                        </td>
                        <td className="p-4">
                          {anyActive
                            ? <Badge>Active</Badge>
                            : <Badge variant="outline">Inactive</Badge>}
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
                            {v.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                          </td>
                          <td className="p-4 text-muted-foreground">{v.fields.length} fields</td>
                          <td className="p-4"><ActionButtons s={v} /></td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        )
      )}
    </div>
  )
}
