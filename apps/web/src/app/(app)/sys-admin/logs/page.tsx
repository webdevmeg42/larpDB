'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type LogEntry = {
  id: string
  userId: string | null
  userDisplayName: string | null
  userEmail: string | null
  method: string
  url: string
  statusCode: number
  durationMs: number
  createdAt: string
}

type AdminUser = {
  id: string
  displayName: string
  email: string
  isSysAdmin: boolean
  createdAt: string
}

type LogsResponse = {
  total: number
  items: LogEntry[]
  limit: number
  offset: number
}

const LIMIT = 100

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-950 text-blue-300',
  POST: 'bg-amber-950 text-amber-300',
  PATCH: 'bg-purple-950 text-purple-300',
  DELETE: 'bg-red-950 text-red-300',
  PUT: 'bg-orange-950 text-orange-300',
}

function statusColor(code: number) {
  if (code >= 500) return 'text-red-400'
  if (code >= 400) return 'text-amber-400'
  return 'text-green-400'
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export default function AuditLogsPage() {
  const { user } = useAuth()

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGenRef = useRef(0)

  useEffect(() => {
    if (!user?.isSysAdmin) return
    api.get<AdminUser[]>('/admin/users').then(setAllUsers).catch(() => {})
  }, [user])

  const fetchLogs = useCallback(async (currentOffset: number) => {
    const gen = ++fetchGenRef.current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(currentOffset),
      })
      if (selectedUserId) params.set('userId', selectedUserId)
      if (from) params.set('from', new Date(from).toISOString())
      if (to) params.set('to', new Date(to).toISOString())
      const res = await api.get<LogsResponse>(`/admin/logs?${params}`)
      if (gen !== fetchGenRef.current) return  // stale response, discard
      setLogs(res.items)
      setTotal(res.total)
    } catch {
      if (gen !== fetchGenRef.current) return
      setError('Failed to load audit logs')
    } finally {
      if (gen === fetchGenRef.current) setLoading(false)
    }
  }, [selectedUserId, from, to])

  useEffect(() => {
    if (!user?.isSysAdmin) return
    setOffset(0)
    fetchLogs(0)
  }, [fetchLogs, user])

  if (!user?.isSysAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground text-sm">This page doesn&apos;t exist.</p>
      </div>
    )
  }

  const displayedLogs = errorsOnly ? logs.filter(l => l.statusCode >= 400) : logs
  const hasFilters = Boolean(selectedUserId || from || to || errorsOnly)

  function handlePrev() {
    const next = Math.max(0, offset - LIMIT)
    setOffset(next)
    fetchLogs(next)
  }

  function handleNext() {
    const next = offset + LIMIT
    setOffset(next)
    fetchLogs(next)
  }

  function clearFilters() {
    setSelectedUserId('')
    setFrom('')
    setTo('')
    setErrorsOnly(false)
    setOffset(0)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + filter bar */}
      <div className="px-6 pt-6 pb-0 border-b">
        <h1 className="text-2xl font-semibold mb-4">Audit Logs</h1>
        <div className="flex flex-wrap items-center gap-3 pb-4">
          <select
            value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); setOffset(0) }}
            className="bg-background border rounded-md px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">All users</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.displayName} ({u.email})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={e => { setFrom(e.target.value); setOffset(0) }}
            className="bg-background border rounded-md px-3 py-2 text-sm"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={e => { setTo(e.target.value); setOffset(0) }}
            className="bg-background border rounded-md px-3 py-2 text-sm"
            aria-label="To date"
          />

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={errorsOnly}
              onChange={e => setErrorsOnly(e.target.checked)}
              className="rounded"
            />
            Errors only
          </label>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : displayedLogs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground text-sm">No logs found</p>
            {errorsOnly && (
              <p className="text-muted-foreground text-xs mt-1">Try turning off "Errors only"</p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Time</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground">Method</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground">URL</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              {displayedLogs.map(log => (
                <tr
                  key={log.id}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/50',
                    log.statusCode >= 400 && 'bg-red-500/5 hover:bg-red-500/10',
                  )}
                >
                  <td
                    className="px-6 py-2.5 text-xs text-muted-foreground whitespace-nowrap"
                    title={new Date(log.createdAt).toLocaleString()}
                  >
                    {relativeTime(log.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    {log.userDisplayName ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { if (log.userId) { setSelectedUserId(log.userId); setOffset(0) } }}
                          className="text-primary hover:underline font-medium text-sm"
                        >
                          {log.userDisplayName}
                        </button>
                        <span className="text-muted-foreground text-xs ml-1.5">{log.userEmail}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">Deleted user</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs font-bold font-mono',
                        METHOD_COLORS[log.method] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {log.method}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{log.url}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn('font-semibold text-sm', statusColor(log.statusCode))}>
                      {log.statusCode}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {log.durationMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && (
        <div className="flex items-center justify-between px-6 py-3 border-t">
          {errorsOnly ? (
            <span className="text-xs text-muted-foreground">
              Showing {displayedLogs.length} error{displayedLogs.length !== 1 ? 's' : ''} on this page — pagination disabled while "Errors only" is active
            </span>
          ) : total > 0 ? (
            <span className="text-xs text-muted-foreground">
              Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()} entries
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No entries</span>
          )}
          {!errorsOnly && (
            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                disabled={offset === 0}
                className="px-3 py-1.5 rounded-md border text-xs disabled:opacity-40 hover:bg-muted disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={handleNext}
                disabled={offset + LIMIT >= total}
                className="px-3 py-1.5 rounded-md border text-xs disabled:opacity-40 hover:bg-muted disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
